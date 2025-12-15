import axios from 'axios'
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios'
import { HttpClient } from '../src/HttpClient'
import { TokenManagerService } from '../src/TokenManagerService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.MockedFunction<typeof axios>

describe('HttpClient', () => {
    const baseUrl = 'https://api.example.com/'
    const token = 'test-auth-token'
    const refreshedToken = 'refreshed-auth-token'
    let tokenManager: jest.Mocked<TokenManagerService>
    let httpClient: HttpClient

    beforeEach(() => {
        jest.resetAllMocks()
        tokenManager = {
            useOrFetchToken: jest.fn().mockResolvedValue(token),
            forceRefresh: jest.fn().mockResolvedValue(refreshedToken)
        } as unknown as jest.Mocked<TokenManagerService>

        httpClient = new HttpClient(baseUrl, tokenManager)
    })

    it('should make a GET request with correct parameters', async () => {
        const endpoint = 'users'
        const mockResponse: AxiosResponse = {
            data: {
                items: [
                    {
                        type: 'POSTTL',
                        code: 'LIBAAL',
                        description: 'Liberal Arts Academic Lead',
                        active: 'Y'
                    }
                ],
                limit: 100,
                offsetby: 0,
                count: 1,
                hasMore: false,
                links: [
                    {
                        rel: 'first',
                        href: 'https://api.corehr.com/ws/tudp/corehr/v1/reference/type/POSTTL/LIBAAL'
                    }
                ]
            },
            status: 200,
            statusText: 'OK',
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() }
        }
        // Mock axios response
        mockedAxios.mockResolvedValueOnce(mockResponse)

        // Make the request
        const response = await httpClient.request('GET', endpoint)

        // Check that axios was called with correct parameters
        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: null,
            timeout: 10_000
        })

        // Check that the response was returned correctly
        expect(response).toEqual(mockResponse)
    })

    it('should make a POST request with body data', async () => {
        const endpoint = 'users'
        const bodyData = { name: 'John Doe', email: 'john@example.com' }
        const mockResponse: AxiosResponse = {
            data: { id: 1, ...bodyData },
            status: 201,
            statusText: 'Created',
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() }
        }

        // Mock axios response
        mockedAxios.mockResolvedValueOnce(mockResponse)

        // Make the request
        const response = await httpClient.request('POST', endpoint, bodyData)

        // Check that axios was called with correct parameters
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: bodyData,
            timeout: 10_000
        })

        // Check that the response was returned correctly
        expect(response).toEqual(mockResponse)
    })

    it('should retry once with a refreshed token on 401', async () => {
        const endpoint = 'protected'
        const mockResponse: AxiosResponse = {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() }
        }

        const axios401Error = {
            isAxiosError: true,
            response: { status: 401 }
        } as AxiosError

        mockedAxios.mockRejectedValueOnce(axios401Error).mockResolvedValueOnce(mockResponse)

        const response = await httpClient.request('GET', endpoint)

        expect(tokenManager.useOrFetchToken).toHaveBeenCalledTimes(1)
        expect(tokenManager.forceRefresh).toHaveBeenCalledTimes(1)

        expect(axios).toHaveBeenNthCalledWith(1, {
            method: 'GET',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: null,
            timeout: 10_000
        })

        expect(axios).toHaveBeenNthCalledWith(2, {
            method: 'GET',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${refreshedToken}`,
                'Content-Type': 'application/json'
            },
            data: null,
            timeout: 10_000
        })

        expect(response).toEqual(mockResponse)
    })

    it('should surface a combined error when refresh after 401 fails', async () => {
        const endpoint = 'protected'
        const axios401Error = {
            isAxiosError: true,
            response: { status: 401 }
        } as AxiosError

        const refreshError = new Error('refresh failed')

        tokenManager.forceRefresh.mockRejectedValueOnce(refreshError)
        mockedAxios.mockRejectedValueOnce(axios401Error)

        await expect(httpClient.request('GET', endpoint)).rejects.toThrow('Retry after 401 failed')
        expect(tokenManager.forceRefresh).toHaveBeenCalledTimes(1)
        expect(axios).toHaveBeenCalledTimes(1)
    })

    it('should retry once on retryable server error for idempotent methods', async () => {
        jest.useFakeTimers()
        const endpoint = 'flaky'
        const mockResponse: AxiosResponse = {
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() }
        }

        const axios503Error = {
            isAxiosError: true,
            response: { status: 503 }
        } as AxiosError

        mockedAxios.mockRejectedValueOnce(axios503Error).mockResolvedValueOnce(mockResponse)

        const responsePromise = httpClient.request('GET', endpoint)

        await jest.runAllTimersAsync()
        const response = await responsePromise
        jest.useRealTimers()

        expect(response).toEqual(mockResponse)
        expect(axios).toHaveBeenCalledTimes(2)
        expect(axios).toHaveBeenNthCalledWith(1, {
            method: 'GET',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: null,
            timeout: 10_000
        })
        expect(axios).toHaveBeenNthCalledWith(2, {
            method: 'GET',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: null,
            timeout: 10_000
        })
    })

    it('should not retry non-idempotent methods on 401', async () => {
        const endpoint = 'submit'
        const axios401Error = {
            isAxiosError: true,
            response: { status: 401 }
        } as AxiosError

        mockedAxios.mockRejectedValueOnce(axios401Error)

        await expect(httpClient.request('POST', endpoint, { foo: 'bar' })).rejects.toBe(axios401Error)

        expect(tokenManager.forceRefresh).not.toHaveBeenCalled()
        expect(axios).toHaveBeenCalledTimes(1)
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: { foo: 'bar' },
            timeout: 10_000
        })
    })

    it('should surface non-401 errors without retry', async () => {
        const endpoint = 'invalid'
        const errorMessage = 'Network Error'
        const mockError = new Error(errorMessage)

        mockedAxios.mockRejectedValueOnce(mockError)

        await expect(httpClient.request('GET', endpoint)).rejects.toThrow(errorMessage)

        expect(tokenManager.forceRefresh).not.toHaveBeenCalled()

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: `${baseUrl}${endpoint}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: null,
            timeout: 10_000
        })
    })
})
