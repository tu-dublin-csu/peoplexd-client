import { AxiosResponse, AxiosHeaders, AxiosError } from 'axios'
import { DepartmentService } from '../src/DepartmentService'
import { PeopleXdClient } from '../src/PeopleXdClient'

jest.mock('../src/PeopleXdClient')

describe('DepartmentService', () => {
    let client: PeopleXdClient
    let departmentService: DepartmentService

    beforeEach(async () => {
        // Mock the static new method to return a mocked instance
        const mockClient = {
            request: jest.fn()
        } as unknown as jest.Mocked<PeopleXdClient>

        ;(PeopleXdClient.new as jest.Mock).mockResolvedValue(mockClient)

        // Use the static method to get an instance
        client = await PeopleXdClient.new('https://api.example.com/', 'test-id', 'test-secret')
        departmentService = new DepartmentService(client)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getDepartment method', () => {
        it('should call client.request with the correct parameters', async () => {
            const deptCode = 'IT_DEPT'
            const mockResponse: AxiosResponse = {
                data: {
                    items: [
                        {
                            type: 'DEPT',
                            code: 'IT_DEPT',
                            description: 'Information Technology Department',
                            active: 'Y'
                        }
                    ],
                    limit: 100,
                    offsetby: 0,
                    count: 1,
                    hasMore: false
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup mock for client.request
            ;(client.request as jest.Mock).mockResolvedValue(mockResponse)

            // Call the method
            const result = await departmentService.getDepartment(deptCode)

            // Verify client.request was called with correct parameters
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/DEPT/${deptCode}`)

            // Verify the result
            expect(result).toEqual(mockResponse)
        })
    })

    describe('getFullDepartment method', () => {
        it('should return the decoded department description', async () => {
            const deptCode = 'IT_DEPT'
            const encodedDescription = 'Information Technology &amp; Systems'
            const decodedDescription = 'Information Technology & Systems'

            const mockResponse: AxiosResponse = {
                data: {
                    items: [
                        {
                            type: 'DEPT',
                            code: 'IT_DEPT',
                            description: encodedDescription,
                            active: 'Y'
                        }
                    ],
                    limit: 100,
                    offsetby: 0,
                    count: 1,
                    hasMore: false
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup mocks
            ;(client.request as jest.Mock).mockResolvedValue(mockResponse)

            // Call the method
            const result = await departmentService.getFullDepartment(deptCode)

            // Verify getDepartment was called
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/DEPT/${deptCode}`)

            // Verify the result
            expect(result).toBe(decodedDescription)
        })

        it('should handle errors properly', async () => {
            const deptCode = 'INVALID'
            const errorMessage = 'Resource not found'

            // Setup mock to throw an error
            ;(client.request as jest.Mock).mockRejectedValue(new Error(errorMessage))

            // Call the method and expect it to throw
            await expect(departmentService.getFullDepartment(deptCode)).rejects.toThrow(errorMessage)

            // Verify request was called with correct parameters
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/DEPT/${deptCode}`)
        })

        it('should handle empty response data', async () => {
            const deptCode = 'EMPTY'

            const mockResponse: AxiosResponse = {
                data: { items: [] },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup mock
            ;(client.request as jest.Mock).mockResolvedValue(mockResponse)

            // Call the method and expect it to throw
            await expect(departmentService.getFullDepartment(deptCode)).rejects.toThrow()

            // Verify request was called
            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/DEPT/${deptCode}`)
        })
    })

    describe('getDepartmentReference method', () => {
        const deptCode = 'DCRO'

        const buildResponse = (data: unknown): AxiosResponse => ({
            data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: { headers: new AxiosHeaders() }
        })

        it('returns a decoded reference record', async () => {
            ;(client.request as jest.Mock).mockResolvedValue(
                buildResponse({
                    items: [
                        {
                            type: 'DEPT',
                            code: 'DCRO',
                            description: 'Office of the CRO &amp; Co',
                            active: 'Y'
                        }
                    ]
                })
            )

            const result = await departmentService.getDepartmentReference(deptCode)

            expect(client.request).toHaveBeenCalledWith('GET', `v1/reference/type/DEPT/${deptCode}`)
            expect(result).toEqual({
                code: 'DCRO',
                description: 'Office of the CRO & Co',
                active: 'Y'
            })
        })

        it('returns null when items is empty', async () => {
            ;(client.request as jest.Mock).mockResolvedValue(buildResponse({ items: [] }))
            const result = await departmentService.getDepartmentReference(deptCode)
            expect(result).toBeNull()
        })

        it('returns null on HTTP 404', async () => {
            const error = new AxiosError('not found')
            error.response = {
                status: 404,
                statusText: 'Not Found',
                data: {},
                headers: {},
                config: { headers: new AxiosHeaders() }
            }
            ;(client.request as jest.Mock).mockRejectedValue(error)

            const result = await departmentService.getDepartmentReference(deptCode)
            expect(result).toBeNull()
        })

        it('rethrows non-404 axios errors', async () => {
            const error = new AxiosError('server boom')
            error.response = {
                status: 500,
                statusText: 'Server Error',
                data: {},
                headers: {},
                config: { headers: new AxiosHeaders() }
            }
            ;(client.request as jest.Mock).mockRejectedValue(error)

            await expect(departmentService.getDepartmentReference(deptCode)).rejects.toThrow('server boom')
        })

        it('rethrows non-axios errors', async () => {
            ;(client.request as jest.Mock).mockRejectedValue(new Error('network down'))
            await expect(departmentService.getDepartmentReference(deptCode)).rejects.toThrow('network down')
        })

        it("defaults active to 'N' when the API omits or denies it", async () => {
            ;(client.request as jest.Mock).mockResolvedValue(
                buildResponse({
                    items: [{ code: 'OLD', description: 'Retired', active: 'N' }]
                })
            )

            const result = await departmentService.getDepartmentReference('OLD')
            expect(result?.active).toBe('N')
        })
    })

    describe('listDepartments method', () => {
        const buildPage = (
            items: Array<{ code: string; description: string; active: 'Y' | 'N' }>,
            hasMore: boolean
        ): AxiosResponse => ({
            data: { items, limit: items.length, offsetby: 0, count: items.length, hasMore },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: { headers: new AxiosHeaders() }
        })

        it('streams paged results until hasMore is false', async () => {
            ;(client.request as jest.Mock)
                .mockResolvedValueOnce(
                    buildPage(
                        [
                            { code: 'A', description: 'Alpha', active: 'Y' },
                            { code: 'B', description: 'Beta &amp;', active: 'N' }
                        ],
                        true
                    )
                )
                .mockResolvedValueOnce(
                    buildPage([{ code: 'C', description: 'Gamma', active: 'Y' }], false)
                )

            const collected: Array<{ code: string; description: string; active: 'Y' | 'N' }> = []
            for await (const item of departmentService.listDepartments()) {
                collected.push(item)
            }

            expect(client.request).toHaveBeenNthCalledWith(
                1,
                'GET',
                'v1/reference/type/DEPT?limit=100&offsetby=0'
            )
            expect(client.request).toHaveBeenNthCalledWith(
                2,
                'GET',
                'v1/reference/type/DEPT?limit=100&offsetby=2'
            )
            expect(collected).toEqual([
                { code: 'A', description: 'Alpha', active: 'Y' },
                { code: 'B', description: 'Beta &', active: 'N' },
                { code: 'C', description: 'Gamma', active: 'Y' }
            ])
        })

        it('filters inactive records when activeOnly is true', async () => {
            ;(client.request as jest.Mock).mockResolvedValue(
                buildPage(
                    [
                        { code: 'A', description: 'Alpha', active: 'Y' },
                        { code: 'B', description: 'Beta', active: 'N' }
                    ],
                    false
                )
            )

            const collected = []
            for await (const item of departmentService.listDepartments({ activeOnly: true })) {
                collected.push(item)
            }

            expect(collected).toEqual([{ code: 'A', description: 'Alpha', active: 'Y' }])
        })

        it('respects a custom pageSize', async () => {
            ;(client.request as jest.Mock).mockResolvedValue(buildPage([], false))

            const iter = departmentService.listDepartments({ pageSize: 25 })
            await iter[Symbol.asyncIterator]().next()

            expect(client.request).toHaveBeenCalledWith(
                'GET',
                'v1/reference/type/DEPT?limit=25&offsetby=0'
            )
        })

        it('stops on an empty page even if hasMore is true', async () => {
            ;(client.request as jest.Mock).mockResolvedValue(buildPage([], true))
            const collected = []
            for await (const item of departmentService.listDepartments()) {
                collected.push(item)
            }
            expect(collected).toEqual([])
            expect(client.request).toHaveBeenCalledTimes(1)
        })
    })
})
