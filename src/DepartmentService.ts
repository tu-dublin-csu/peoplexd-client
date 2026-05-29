import axios, { AxiosResponse } from 'axios'
import { PeopleXdClient } from './PeopleXdClient'
import { decodeHtml } from './Utilities'

export interface DepartmentReference {
    code: string
    description: string
    active: 'Y' | 'N'
}

export interface ListDepartmentsOptions {
    activeOnly?: boolean
    pageSize?: number
}

const DEFAULT_PAGE_SIZE = 100

export class DepartmentService {
    private client: PeopleXdClient

    constructor(client: PeopleXdClient) {
        this.client = client
    }

    public async getDepartment(deptCode: string): Promise<AxiosResponse> {
        return await this.client.request('GET', `v1/reference/type/DEPT/${decodeHtml(deptCode)}`)
    }

    /**
     * Fetch a single DEPT reference record. Returns `null` when the code is unknown
     * (HTTP 404 or empty `items`). Re-throws all other errors so transport/auth
     * failures are not silently masked.
     */
    public async getDepartmentReference(deptCode: string): Promise<DepartmentReference | null> {
        let response: AxiosResponse
        try {
            response = await this.getDepartment(deptCode)
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null
            }
            throw error
        }

        const item = response?.data?.items?.[0] as
            | { code?: string; description?: string; active?: string }
            | undefined
        if (!item?.description) {
            return null
        }

        return {
            code: item.code ?? deptCode,
            description: decodeHtml(item.description),
            active: item.active === 'Y' ? 'Y' : 'N'
        }
    }

    public async getFullDepartment(deptCode: string): Promise<string> {
        const response = await this.getDepartment(deptCode)
        const description = response?.data?.items?.[0]?.description

        if (!description) {
            throw new Error(`No department found for code: ${deptCode}`)
        }

        return decodeHtml(description)
    }

    /**
     * Stream every DEPT reference record using the paged `v1/reference/type/DEPT`
     * endpoint. Defaults match the raw API: all records (including inactive),
     * page size 100.
     */
    public async *listDepartments(
        options: ListDepartmentsOptions = {}
    ): AsyncIterable<DepartmentReference> {
        const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
        const activeOnly = options.activeOnly ?? false
        let offset = 0

        while (true) {
            const response = await this.client.request(
                'GET',
                `v1/reference/type/DEPT?limit=${pageSize}&offsetby=${offset}`
            )
            const items = (response?.data?.items ?? []) as Array<{
                code?: string
                description?: string
                active?: string
            }>

            for (const item of items) {
                if (!item.code || !item.description) {
                    continue
                }
                if (activeOnly && item.active !== 'Y') {
                    continue
                }
                yield {
                    code: item.code,
                    description: decodeHtml(item.description),
                    active: item.active === 'Y' ? 'Y' : 'N'
                }
            }

            const hasMore = Boolean(response?.data?.hasMore)
            if (!hasMore || items.length === 0) {
                return
            }
            offset += items.length
        }
    }
}
