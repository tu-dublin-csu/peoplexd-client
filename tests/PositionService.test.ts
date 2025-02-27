import { AxiosResponse, AxiosHeaders } from 'axios'
import { PositionService } from '../src/PositionService'
import { PeopleXdClient } from '../src/PeopleXdClient'
import { decodeHtml } from '../src/Utilities'

jest.mock('../src/PeopleXdClient')
jest.mock('../src/Utilities')

describe('PositionService', () => {
    let client: PeopleXdClient
    let positionService: PositionService

    beforeEach(async () => {
        // Mock the static new method to return a mocked instance
        const mockClient = {
            request: jest.fn()
            // Add any other methods/properties your tests need
        } as unknown as jest.Mocked<PeopleXdClient>

        ;(PeopleXdClient.new as jest.Mock).mockResolvedValue(mockClient)

        // Use the static method to get an instance
        client = await PeopleXdClient.new('https://api.example.com/', 'test-id', 'test-secret')
        positionService = new PositionService(client)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getPositionTitle method', () => {
        it('should call client.request with the correct parameters', async () => {
            const positionCode = 'LIBAAL'
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
                    hasMore: false
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup mock for client.request
            ;(client.request as jest.Mock).mockResolvedValue(mockResponse)

            // Call the method
            const result = await positionService.getPositionTitle(positionCode)

            // Verify client.request was called with correct parameters
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/POSTTL/${positionCode}`)

            // Verify the result
            expect(result).toEqual(mockResponse)
        })
    })

    describe('getFullJobTitle method', () => {
        it('should return the decoded job title', async () => {
            const positionCode = 'LIBAAL'
            const encodedTitle = 'Liberal Arts Academic &amp; Lead'
            const decodedTitle = 'Liberal Arts Academic & Lead'

            const mockResponse: AxiosResponse = {
                data: {
                    items: [
                        {
                            type: 'POSTTL',
                            code: 'LIBAAL',
                            description: encodedTitle,
                            active: 'Y'
                        }
                    ],
                    limit: 100,
                    offsetby: 0,
                    count: 1,
                    hasMore: false
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup mocks
            ;(client.request as jest.Mock).mockResolvedValue(mockResponse)
            ;(decodeHtml as jest.Mock).mockReturnValue(decodedTitle)

            // Call the method
            const result = await positionService.getFullJobTitle(positionCode)

            // Verify getPositionTitle was called
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/POSTTL/${positionCode}`)

            // Verify decodeHtml was called with the correct parameter
            expect(decodeHtml).toHaveBeenCalledWith(encodedTitle)

            // Verify the result
            expect(result).toBe(decodedTitle)
        })

        it('should handle errors properly', async () => {
            const positionCode = 'INVALID'
            const errorMessage = 'Resource not found'

            // Setup mock to throw an error
            ;(client.request as jest.Mock).mockRejectedValue(new Error(errorMessage))

            // Call the method and expect it to throw
            await expect(positionService.getFullJobTitle(positionCode)).rejects.toThrow(errorMessage)

            // Verify request was called with correct parameters
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/POSTTL/${positionCode}`)
        })

        it('should handle empty response data', async () => {
            const positionCode = 'EMPTY'

            const mockResponse: AxiosResponse = {
                data: { items: [] },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup mock
            ;(client.request as jest.Mock).mockResolvedValue(mockResponse)

            // Call the method and expect it to throw
            await expect(positionService.getFullJobTitle(positionCode)).rejects.toThrow()

            // Verify request was called
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/POSTTL/${positionCode}`)
        })
    })
})
