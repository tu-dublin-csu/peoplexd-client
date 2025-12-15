import axios, { AxiosError, AxiosResponse } from 'axios'
import { TokenManagerService } from './TokenManagerService'
import { log, LogType } from './Utilities'

const DEFAULT_HTTP_TIMEOUT_MS = 10_000
const RETRYABLE_STATUS_CODES = [502, 503, 504]
const RETRY_DELAY_MS = 500
const IDEMPOTENT_METHODS = ['get', 'head', 'options']

export class HttpClient {
    private url: string
    private tokenManager: TokenManagerService

    constructor(url: string, tokenManager: TokenManagerService) {
        this.url = url
        this.tokenManager = tokenManager
    }

    public async request(method: string, endpoint: string, body: unknown = null): Promise<AxiosResponse> {
        const uri = `${this.url}${endpoint}`
        const methodLower = method.toLowerCase()
        const buildHeaders = async (token: string) => ({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        })

        let attempts = 0
        const maxAttempts = 1

        while (true) {
            try {
                const token = await this.tokenManager.useOrFetchToken()
                const headers = await buildHeaders(token)
                const response = await axios({
                    method,
                    url: uri,
                    headers,
                    data: body,
                    timeout: DEFAULT_HTTP_TIMEOUT_MS
                })
                log(LogType.DEBUG, `${method.toUpperCase()} ${uri} response: ${JSON.stringify(response.data, null, 2)}`)
                return response
            } catch (error: unknown) {
                const axiosError = error as AxiosError

                if (axiosError?.response?.status === 401 && IDEMPOTENT_METHODS.includes(methodLower)) {
                    try {
                        const refreshedToken = await this.tokenManager.forceRefresh()
                        const retryHeaders = await buildHeaders(refreshedToken)
                        const retryResponse = await axios({
                            method,
                            url: uri,
                            headers: retryHeaders,
                            data: body,
                            timeout: DEFAULT_HTTP_TIMEOUT_MS
                        })
                        log(
                            LogType.DEBUG,
                            `${method.toUpperCase()} ${uri} retry after 401 response: ${JSON.stringify(retryResponse.data, null, 2)}`
                        )
                        return retryResponse
                    } catch (refreshError: unknown) {
                        log(
                            LogType.ERROR,
                            `Error during ${method.toUpperCase()} retry after 401 to ${uri}: ${refreshError instanceof Error ? refreshError.message : refreshError}`
                        )
                        const combined = new Error(
                            `Retry after 401 failed; original 401 kept. Refresh error: ${refreshError instanceof Error ? refreshError.message : refreshError}`
                        )
                        ;(combined as { cause?: unknown }).cause = {
                            original: axiosError,
                            refresh: refreshError
                        }
                        throw combined
                    }
                }

                if (attempts < maxAttempts && this.shouldRetryOnce(axiosError, methodLower)) {
                    attempts += 1
                    await this.delay(RETRY_DELAY_MS)
                    continue
                }

                log(
                    LogType.ERROR, `Error during ${method.toUpperCase()} request to ${uri}: ${error instanceof Error ? error.message : error}`
                )
                throw error
            }
        }
    }

    private shouldRetryOnce(error: AxiosError, methodLower: string): boolean {
        if (!IDEMPOTENT_METHODS.includes(methodLower)) {
            return false
        }

        const status = error.response?.status ?? 0
        if (RETRYABLE_STATUS_CODES.includes(status)) {
            return true
        }

        if (error.code === 'ECONNABORTED') {
            return true
        }

        return false
    }

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
