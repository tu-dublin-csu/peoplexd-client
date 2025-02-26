import axios, { AxiosResponse } from 'axios';

export class HttpClient {
    private url: string;
    private token: string;

    constructor(url: string, token: string) {
        this.url = url;
        this.token = token;
    }

    public async request(method: string, endpoint: string, body: unknown = null): Promise<AxiosResponse> {
        const uri = `${this.url}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await axios({
                method,
                url: uri,
                headers,
                data: body
            });
            console.debug(`${method.toUpperCase()} ${uri} response: ${JSON.stringify(response.data, null, 2)}`);
            return response;
        } catch (error: unknown) {
            console.error(
                `Error during ${method.toUpperCase()} request to ${uri}: ${error instanceof Error ? error.message : error}`
            );
            throw error;
        }
    }
}