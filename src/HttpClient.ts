import axios, { AxiosError, AxiosResponse } from 'axios'
import { TokenManagerService } from './TokenManagerService'
import { log, LogType } from './Utilities'

export class HttpClient {
    private url: string
    private tokenManager: TokenManagerService

    constructor(url: string, tokenManager: TokenManagerService) {
        this.url = url
        this.tokenManager = tokenManager
    }

    public async request(method: string, endpoint: string, body: unknown = null): Promise<AxiosResponse> {
        const uri = `${this.url}${endpoint}`
        const buildHeaders = async (token: string) => ({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        })

        try {
            const token = await this.tokenManager.useOrFetchToken()
            const headers = await buildHeaders(token)
            const response = await axios({
                method,
                url: uri,
                headers,
                data: body
            })
            log(LogType.DEBUG, `${method.toUpperCase()} ${uri} response: ${JSON.stringify(response.data, null, 2)}`)
            return response
        } catch (error: unknown) {
            const axiosError = error as AxiosError
            if (axiosError?.response?.status === 401) {
                try {
                    const refreshedToken = await this.tokenManager.forceRefresh()
                    const retryHeaders = await buildHeaders(refreshedToken)
                    const retryResponse = await axios({
                        method,
                        url: uri,
                        headers: retryHeaders,
                        data: body
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
                    throw refreshError
                }
            }

            log(
                LogType.ERROR, `Error during ${method.toUpperCase()} request to ${uri}: ${error instanceof Error ? error.message : error}`
            )
            throw error
        }
    }
}
