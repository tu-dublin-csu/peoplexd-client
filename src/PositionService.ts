import { AxiosResponse } from 'axios'
import { PeopleXdClient } from './PeopleXdClient'
import { decodeHtml, log, LogType } from './Utilities'

export class PositionService {
    private client: PeopleXdClient

    constructor(client: PeopleXdClient) {
        this.client = client
    }

    public async getPositionTitle(positionCode: string): Promise<AxiosResponse> {
        // positionCode can come from `v1/person/appointment/${staffNumber}` api. 
        // It is encoded html there, so we must decode it here to make this api call safely.
        return await this.client.request('GET', `v1/reference/type/POSTTL/${decodeHtml(positionCode)}`)
    }

    public async getFullJobTitle(positionCode: string): Promise<string> {
        const response = await this.getPositionTitle(positionCode)
        if(response?.data?.items[0]?.description){
            return decodeHtml(response.data.items[0].description)
        }
        log(LogType.ERROR, `No full job title found for position code: ${positionCode}`);
        throw new Error(`No full job title found for position code: ${positionCode}`);
    }
}
