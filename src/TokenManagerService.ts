import axios from 'axios'
import { log, LogType } from './Utilities'

const DEFAULT_SKEW_SECONDS = 60
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

interface PeopleXdToken {
    access_token: string
    expires_at: Date
}

interface TokenManagerOptions {
    skewSeconds?: number
    requestTimeoutMs?: number
}

/**
 * TokenManagerService class to handle OAuth token management.
 */
export class TokenManagerService {
    private url: string
    private clientId: string
    private clientSecret: string
    private pxdToken: null | PeopleXdToken
    private options: Required<TokenManagerOptions>
    private fetchInFlight: Promise<string> | null

    /**
     * Creates an instance of TokenManagerService.
     * @param {string} url - The base URL for the OAuth token endpoint.
     * @param {string} clientId - The client ID for OAuth authentication.
     * @param {string} clientSecret - The client secret for OAuth authentication.
     */
    private constructor(url: string, clientId: string, clientSecret: string, options?: TokenManagerOptions) {
        this.url = url
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.pxdToken = null
        this.fetchInFlight = null
        this.options = {
            skewSeconds: options?.skewSeconds ?? DEFAULT_SKEW_SECONDS,
            requestTimeoutMs: options?.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
        }
    }

    /**
     * Factory method to create instance
     * @param {string} url
     * @param {string} clientId
     * @param {string} clientSecret
     * @returns {TokenManagerService}
     */
    public static async new(
        url: string,
        clientId: string,
        clientSecret: string,
        options?: TokenManagerOptions
    ): Promise<TokenManagerService> {
        const tokenManager = new TokenManagerService(url, clientId, clientSecret, options)
        await tokenManager.useOrFetchToken()
        return tokenManager
    }

    /**
     * Calculates the token expiration date.
     * @param {number} expiresIn - The number of seconds until the token expires.
     * @returns {Date} The expiration date.
     */
    private tokenExpires(expiresIn: number): Date {
        return new Date(Date.now() + (expiresIn - this.options.skewSeconds) * 1000)
    }

    /**
     * Fetches a new OAuth token from the server.
     * @throws Will throw an error if the request fails.
     */
    private async fetchToken(): Promise<string> {
        if (this.fetchInFlight) {
            return this.fetchInFlight
        }

        const uri = `${this.url}oauth/token`

        this.fetchInFlight = (async () => {
            try {
                const response = await axios.post(uri, null, {
                    auth: {
                        username: this.clientId,
                        password: this.clientSecret
                    },
                    params: {
                        grant_type: 'client_credentials'
                    },
                    timeout: this.options.requestTimeoutMs
                })

                const keys = response.data
                this.pxdToken = {
                    access_token: keys.access_token,
                    expires_at: this.tokenExpires(keys.expires_in)
                }
                return this.pxdToken.access_token
            } catch (error: unknown) {
                if (error instanceof Error) {
                    log(LogType.ERROR, 'Error fetching token:', error.message)
                } else {
                    log(LogType.ERROR, 'Unknown error fetching token:', error)
                }
                throw error
            } finally {
                this.fetchInFlight = null
            }
        })()

        return this.fetchInFlight
    }

    private isExpired(token: PeopleXdToken): boolean {
        const expires = new Date(token.expires_at)
        if (Number.isNaN(expires.getTime())) {
            return true
        }

        return expires.getTime() <= Date.now() + this.options.skewSeconds * 1000
    }

    /**
     * Force refresh the token regardless of current expiry state.
     */
    public async forceRefresh(): Promise<string> {
        this.pxdToken = null
        return this.fetchToken()
    }

    /**
     * Uses the cached token or fetches a new one if the cached token is expired or not available.
     * @returns {string} The access token.
     */
    public async useOrFetchToken(): Promise<string> {
        if (!this.pxdToken || this.isExpired(this.pxdToken)) {
            return this.fetchToken()
        }

        return this.pxdToken.access_token
    }
}
