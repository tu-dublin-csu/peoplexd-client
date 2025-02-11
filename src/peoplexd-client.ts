import axios, { AxiosResponse } from 'axios'
import { TokenManager } from './token-manager'

const APPOINTMENT_ENDPOINT = 'v1/person/appointment'
const DEPARTMENT_ENDPOINT = 'v1/reference/type/DEPT'
const POSITION_ENDPOINT = 'v1/reference/type/POSTTL'

export enum HttpRequestMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete'
}
enum HeadersContentType {
    APPLICATION_JSON = 'application/json'
}

/**
 * PeopleXdClient class to interact with the PeopleXD API.
 */
export class PeopleXdClient {
    private url: string
    private clientId: string
    private clientSecret: string
    private useCache: boolean
    static tokenManager: TokenManager

    /**
     * Creates an instance of PeopleXdClient.
     * @param {string} url - The base URL of the PeopleXD API.
     * @param {string} clientId - The client ID for OAuth authentication.
     * @param {string} clientSecret - The client secret for OAuth authentication.
     * @param {boolean} [useCache=true] - Whether to use cached tokens.
     */
    private constructor(url: string, clientId: string, clientSecret: string, useCache = true) {
        this.url = url
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.useCache = useCache
    }

    /**
     * Factory method to create instance
     * @param {string} url
     * @param {string} clientId
     * @param {string} clientSecret
     * @param {boolean} [useCache=true] - Whether to use cached tokens.
     * @returns {PeopleXdClient}
     */
    static async new(url: string, clientId: string, clientSecret: string, useCache = true): Promise<PeopleXdClient> {
        const instance = new PeopleXdClient(url, clientId, clientSecret, useCache)
        this.tokenManager = await TokenManager.new(url, clientId, clientSecret)
        return instance
    }

    /**
     * Fetches the appointments for a given staff number.
     * @param {string} staffNumber - The staff number to fetch appointments for.
     * @returns {Promise<Object>} The appointments data.
     */
    public async appointments(staffNumber: string): Promise<AxiosResponse> {
        return await this.request(HttpRequestMethod.GET, `${APPOINTMENT_ENDPOINT}/${staffNumber}`)
    }

    /**
     * Fetches the department information for a given department code.
     * @param {string} deptCode - The department code to fetch information for.
     * @returns {Promise<AxiosResponse>} The department data.
     */
    public async department(deptCode: string): Promise<AxiosResponse> {
        return await this.request(HttpRequestMethod.GET, `${DEPARTMENT_ENDPOINT}/${deptCode}`)
    }

    /**
     * Fetches the position title information for a given position title code
     * @param {string} positionCode - The position title to query.
     * @returns {Promise<AxiosResponse>} The position title data.
     */
    public async positionTitle(positionCode: string): Promise<AxiosResponse> {
        return await this.request(HttpRequestMethod.GET, `${POSITION_ENDPOINT}/${positionCode}`)
    }

    /**
     * Makes an HTTP request to the PeopleXD API.
     * @param {string} method - The HTTP method (get, post, put).
     * @param {string} endpoint - The API endpoint.
     * @param {Object} [body=null] - The request body for POST and PUT requests.
     * @returns {Promise<Object>} The response data.
     * @throws Will throw an error if the request fails.
     */
    private async request(method: HttpRequestMethod, endpoint: string, body = null): Promise<AxiosResponse> {
        const uri = `${this.url}${endpoint}`
        const token = await PeopleXdClient.tokenManager.useOrFetchToken()
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': HeadersContentType.APPLICATION_JSON
        }

        try {
            const response = await axios({
                method,
                url: uri,
                headers,
                data: body
            })
            console.debug(`${method.toUpperCase()} ${uri} response: ${JSON.stringify(response.data, null, 2)}`)
            return response
        } catch (error: unknown) {
            console.error(
                `Error during ${method.toUpperCase()} request to ${uri}: ${error instanceof Error ? error.message : error}`
            )
            throw error
        }
    }
}
