import { AxiosResponse } from 'axios';
import { PeopleXdClient } from './PeopleXdClient';
import { decodeHtml } from './Utilities';

export class PositionService {
    private client: PeopleXdClient;

    constructor(client: PeopleXdClient) {
        this.client = client;
    }

    public async getPositionTitle(positionCode: string): Promise<AxiosResponse> {
        return await this.client.request('GET', `v1/reference/type/POSTTL/${positionCode}`);
    }

    public async getFullJobTitle(positionCode: string): Promise<string> {
        const response = await this.getPositionTitle(positionCode);
        return decodeHtml(response.data.items[0].description);
    }
}