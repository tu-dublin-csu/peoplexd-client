import fs from 'fs'
import { TokenManager } from '../src/token-manager'
import axios from 'axios'

jest.mock('fs')
jest.mock('axios')

describe('TokenManager', () => {
    const url: string = 'https://api.example.com/'
    const clientId: string = 'test-client-id'
    const clientSecret: string = 'test-client-secret'
    let tokenManager: TokenManager

    beforeEach(() => {})

    afterEach(() => {
        jest.clearAllMocks()
        jest.restoreAllMocks()
    })

    test('should fetch the token from the server when none is available on creation, then read from file there after', async () => {
        const response = {
            data: { access_token: 'new-token', expires_in: 3600 }
        }
        ;(axios.post as jest.Mock).mockResolvedValue(response)

        tokenManager = await TokenManager.new(url, clientId, clientSecret)

        // this will read from cache
        const accessToken = await tokenManager.useOrFetchToken()

        expect(accessToken).toEqual('new-token')
    })

    test('should read cached token on file when available and not expired', async () => {
        const currentDate = new Date()
        const nextDay = new Date(currentDate)
        nextDay.setDate(currentDate.getDate() + 1)

        const cachedToken = {
            access_token: 'cached-token',
            expires_at: nextDay
        }

        jest.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify(cachedToken))

        tokenManager = await TokenManager.new(url, clientId, clientSecret)

        const accessToken = await tokenManager.useOrFetchToken()
        // never try an fetch a token
        expect(axios.post as jest.Mock).toHaveBeenCalledTimes(0)
        expect(accessToken).toEqual('cached-token')
    })

    test('should fetch the token from the server when current token is expired', async () => {
        const currentDate = new Date()
        const previousDay = new Date(currentDate)
        previousDay.setDate(currentDate.getDate() - 1)
        const nextDay = new Date(currentDate)
        nextDay.setDate(currentDate.getDate() + 1)

        const cachedToken = {
            access_token: 'cached-token-2',
            expires_at: previousDay
        }

        jest.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify(cachedToken))

        tokenManager = await TokenManager.new(url, clientId, clientSecret)

        const response = {
            data: { access_token: 'new-token-2', expires_in: nextDay }
        }
        ;(axios.post as jest.Mock).mockResolvedValue(response)

        const accessToken = await tokenManager.useOrFetchToken()

        expect(accessToken).toEqual('new-token-2')
    })

    test('should handle an error when fetching the token from the server', async () => {
        ;(axios.post as jest.Mock).mockRejectedValue(new Error('Network Error'))
        await expect(TokenManager.new(url, clientId, clientSecret)).rejects.toThrow(new Error('Network Error'))
    })

    test('should log error when error occurs caching token', async () => {
        const response = {
            data: { access_token: 'new-token-3', expires_in: 3600 }
        }
        ;(axios.post as jest.Mock).mockResolvedValue(response)

        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
            throw new Error('Error writing file')
        })
        jest.spyOn(console, 'error')

        tokenManager = await TokenManager.new(url, clientId, clientSecret)

        const accessToken = await tokenManager.useOrFetchToken()

        expect(accessToken).toEqual('new-token-3')
        expect(console.error).toHaveBeenCalledTimes(2)
        expect(console.error).toHaveBeenCalledWith('Error caching token:', 'Error writing file')
    })
})
