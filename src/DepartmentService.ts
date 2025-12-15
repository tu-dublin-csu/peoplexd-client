import { AxiosResponse } from 'axios'
import { PeopleXdClient } from './PeopleXdClient'
import { decodeHtml } from './Utilities'

export class DepartmentService {
    private client: PeopleXdClient

    constructor(client: PeopleXdClient) {
        this.client = client
    }

    public async getDepartment(deptCode: string): Promise<AxiosResponse> {
        return await this.client.request('GET', `v1/reference/type/DEPT/${decodeHtml(deptCode)}`)
    }

    public async getFullDepartment(deptCode: string): Promise<string> {
        const response = await this.getDepartment(deptCode)
        return decodeHtml(response.data.items[0].description)
    }
}
