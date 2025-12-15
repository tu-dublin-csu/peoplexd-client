import axios from 'axios'
import timekeeper from 'timekeeper'
import MockAdapter from 'axios-mock-adapter'
import { TokenManagerService } from '../src/TokenManagerService'

describe('TokenManagerService', () => {
    const url = 'https://example.com/'
    const clientId = 'test-client-id'
    const clientSecret = 'test-client-secret'
    let mock: MockAdapter

    beforeEach(() => {
        mock = new MockAdapter(axios)
        timekeeper.freeze(new Date('2025-01-01'))
        jest.clearAllMocks()
    })

    afterEach(() => {
        mock.restore()
        timekeeper.reset()
    })

    it('should fetch a new token if no cached token is available', async () => {
        const tokenResponse = {
            access_token: 'new-access-token',
            expires_in: 3600
        }

        mock.onPost(`${url}oauth/token`).reply(200, tokenResponse)

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret)

        expect(tokenManager).toBeDefined()
        await expect(tokenManager.useOrFetchToken()).resolves.toBe('new-access-token')
    })

    it('should reuse the in-memory token if it is not expired', async () => {
        const tokenResponse = {
            access_token: 'cached-access-token',
            expires_in: 3600
        }

        mock.onPost(`${url}oauth/token`).reply(200, tokenResponse)

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret)

        expect(tokenManager).toBeDefined()
        await expect(tokenManager.useOrFetchToken()).resolves.toBe('cached-access-token')
        await expect(tokenManager.useOrFetchToken()).resolves.toBe('cached-access-token')
        expect(mock.history.post.length).toBe(1)
    })

    it('should fetch a new token when the in-memory token is expired', async () => {
        const firstTokenResponse = {
            access_token: 'first-access-token',
            expires_in: 3600
        }

        const secondTokenResponse = {
            access_token: 'refreshed-access-token',
            expires_in: 3600
        }

        const tokenEndpoint = `${url}oauth/token`

        mock.onPost(tokenEndpoint).replyOnce(200, firstTokenResponse).onPost(tokenEndpoint).replyOnce(200, secondTokenResponse)

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret)

        expect(tokenManager).toBeDefined()
        await expect(tokenManager.useOrFetchToken()).resolves.toBe('first-access-token')

        // Advance time beyond expiry (expires_in 3600 with 60s skew => expires in 3540 seconds)
        const now = new Date('2025-01-01T00:00:00Z')
        timekeeper.travel(new Date(now.getTime() + 4_000 * 1000))

        await expect(tokenManager.useOrFetchToken()).resolves.toBe('refreshed-access-token')
        expect(mock.history.post.length).toBe(2)
    })

    it('should handle errors when fetching a new token', async () => {
        mock.onPost(`${url}oauth/token`).reply(500)

        await expect(TokenManagerService.new(url, clientId, clientSecret)).rejects.toThrow(
            'Request failed with status code 500'
        )
    })
})
