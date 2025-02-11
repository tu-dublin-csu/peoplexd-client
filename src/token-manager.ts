import fs from 'fs'
import path from 'path'
import axios from 'axios'

const TMP_DIR = 'tmp'
const CACHE_TOKEN_FILE = 'cache_token'
const UTF8 = 'utf8'

interface PeopleXdToken {
    access_token: string
    expires_at: Date
}

/**
 * TokenManager class to handle OAuth token management.
 */
export class TokenManager {
    private url: string
    private clientId: string
    private clientSecret: string
    private pxdToken: null | PeopleXdToken

    /**
     * Creates an instance of TokenManager.
     * @param {string} url - The base URL for the OAuth token endpoint.
     * @param {string} clientId - The client ID for OAuth authentication.
     * @param {string} clientSecret - The client secret for OAuth authentication.
     */
    private constructor(url: string, clientId: string, clientSecret: string) {
        this.url = url
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.pxdToken = null
    }

    /**
     * Factory method to create instance
     * @param {string} url 
     * @param {string} clientId 
     * @param {string} clientSecret 
     * @returns {TokenManager}
     */
    public static async createInstance(url: string, clientId: string, clientSecret: string): Promise<TokenManager> {
        const tokenManager = new TokenManager(url, clientId, clientSecret)
        await tokenManager.useOrFetchToken()
        return tokenManager
    }

    /**
     * Reads the cached token from the file system.
     */
    private readCachedToken(): void {
        try {
            const cachedToken: PeopleXdToken = JSON.parse(fs.readFileSync(`${TMP_DIR}/${CACHE_TOKEN_FILE}`, UTF8))
            this.pxdToken = cachedToken
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.log(`No cached token found or error reading cache: ${error.message}`)
            } else {
                console.log(`No cached token found or error reading cache`)
            }
            this.pxdToken = null
        }
    }

    /**
     * Caches the token to the file system.
     */
    private cacheToken(): void {
        try {
            if (!fs.existsSync(TMP_DIR)) {
                fs.mkdirSync(TMP_DIR, { recursive: true })
            }
            fs.writeFileSync(path.join(TMP_DIR, CACHE_TOKEN_FILE), JSON.stringify(this.pxdToken))
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error caching token:', error.message)
            } else {
                console.error('Unknown error caching token:', error)
            }
        }
    }

    /**
     * Calculates the token expiration date.
     * @param {number} expiresIn - The number of seconds until the token expires.
     * @returns {Date} The expiration date.
     */
    private tokenExpires(expiresIn: number): Date {
        return new Date(Date.now() + (expiresIn - 60) * 1000)
    }

    /**
     * Fetches a new OAuth token from the server.
     * @throws Will throw an error if the request fails.
     */
    private async fetchToken(): Promise<void> {
        try {
            const uri = `${this.url}oauth/token`
            const response = await axios.post(uri, null, {
                auth: {
                    username: this.clientId,
                    password: this.clientSecret
                },
                params: {
                    grant_type: 'client_credentials'
                }
            })
            const keys = response.data
            this.pxdToken = {
                access_token: keys.access_token,
                expires_at: this.tokenExpires(keys.expires_in)
            }
            this.cacheToken()
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error fetching token:', error.message)
            } else {
                console.error('Unknown error fetching token:', error)
            }
            throw error
        }
    }

    /**
     * Uses the cached token or fetches a new one if the cached token is expired or not available.
     * @returns {string} The access token.
     */
    public async useOrFetchToken(): Promise<string> {
        this.readCachedToken()

        if (!this.pxdToken || new Date() >= new Date(this.pxdToken.expires_at)) {
            await this.fetchToken()
        }
        return this.pxdToken!.access_token
    }
}
