import { AxiosResponse, AxiosHeaders } from 'axios'
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
})
