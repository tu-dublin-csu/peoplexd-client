import { AxiosResponse, AxiosHeaders } from 'axios'
import { PeopleXdClient, PeopleXdClientOptions } from '../src/PeopleXdClient'
import { TokenManagerService } from '../src/TokenManagerService'
import { HttpClient } from '../src/HttpClient'
import { AppointmentService } from '../src/AppointmentService'
import { DepartmentService } from '../src/DepartmentService'
import { PositionService } from '../src/PositionService'
import { ProcessedAppointment } from '../src/AppointmentInterfaces'

jest.mock('../src/TokenManagerService')
jest.mock('../src/HttpClient')
jest.mock('../src/AppointmentService')
jest.mock('../src/DepartmentService')
jest.mock('../src/PositionService')

describe('PeopleXdClient', () => {
    const url = 'https://api.example.com/'
    const clientId = 'test-client-id'
    const clientSecret = 'test-client-secret'
    const token = 'test-token'
    let client: PeopleXdClient
    let httpClientMock: jest.Mocked<HttpClient>
    let positionServiceMock: jest.Mocked<PositionService>
    let tokenManagerMock: { useOrFetchToken: jest.Mock; forceRefresh: jest.Mock }
    const defaultOptions: PeopleXdClientOptions = {
        titleCodeSubstitutions: {
            HPAL: 'AL',
            HPSL: 'SL'
        }
    }

    beforeEach(async () => {
        // Mock TokenManagerService.new and useOrFetchToken
        tokenManagerMock = {
            useOrFetchToken: jest.fn().mockResolvedValue(token),
            forceRefresh: jest.fn()
        }

        ;(TokenManagerService.new as jest.Mock).mockResolvedValue(tokenManagerMock)

        // Create a new instance of PeopleXdClient with options
        client = await PeopleXdClient.new(url, clientId, clientSecret, defaultOptions)

        // Cast httpClient and positionService to mocked versions to access mock methods
        httpClientMock = (client as unknown as { httpClient: jest.Mocked<HttpClient> }).httpClient
        positionServiceMock = (client as unknown as { positionService: jest.Mocked<PositionService> }).positionService
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('new static method', () => {
        it('should initialize PeopleXdClient with proper dependencies', async () => {
            // Verify TokenManagerService was initialized correctly
            expect(TokenManagerService.new).toHaveBeenCalledWith(url, clientId, clientSecret)

            // Verify the token was requested
            expect(tokenManagerMock.useOrFetchToken).toHaveBeenCalled()

            // Verify HttpClient was constructed with correct parameters
            expect(HttpClient).toHaveBeenCalledWith(url, tokenManagerMock)

            // Verify services were initialized
            expect(AppointmentService).toHaveBeenCalledWith(client)
            expect(DepartmentService).toHaveBeenCalledWith(client)
            expect(PositionService).toHaveBeenCalledWith(client)
        })

        it('should initialize with default options when none provided', async () => {
            const clientNoOptions = await PeopleXdClient.new(url, clientId, clientSecret)
            expect(clientNoOptions.getOptions()).toEqual({})
        })

        it('should initialize with provided options', async () => {
            expect(client.getOptions()).toEqual(defaultOptions)
        })
    })

    describe('request method', () => {
        it('should delegate to httpClient.request', async () => {
            const method = 'GET'
            const endpoint = 'test-endpoint'
            const body = { key: 'value' }
            const mockResponse: AxiosResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            httpClientMock.request.mockResolvedValue(mockResponse)

            const response = await client.request(method, endpoint, body)

            expect(httpClientMock.request).toHaveBeenCalledWith(method, endpoint, body)
            expect(response).toEqual(mockResponse)
        })
    })

    describe('getFullDepartment method', () => {
        it('should delegate to departmentService.getFullDepartment', async () => {
            const deptCode = 'D001'
            const fullDepartment = 'Computer Science Department'

            // Get departmentService mock and set up return value
            const departmentServiceMock = (client as unknown as { departmentService: jest.Mocked<DepartmentService> })
                .departmentService
            departmentServiceMock.getFullDepartment.mockResolvedValue(fullDepartment)

            const result = await client.getFullDepartment(deptCode)

            expect(departmentServiceMock.getFullDepartment).toHaveBeenCalledWith(deptCode)
            expect(result).toBe(fullDepartment)
        })
    })

    describe('getFullJobTitle method', () => {
        it('should delegate to positionService.getFullJobTitle with original code when no substitution exists', async () => {
            const positionCode = 'P001'
            const fullJobTitle = 'Senior Software Engineer'

            positionServiceMock.getFullJobTitle.mockResolvedValue(fullJobTitle)

            const result = await client.getFullJobTitle(positionCode)

            expect(positionServiceMock.getFullJobTitle).toHaveBeenCalledWith(positionCode)
            expect(result).toBe(fullJobTitle)
        })

        it('should use substituted code when one exists', async () => {
            const originalCode = 'HPAL'
            const substitutedCode = 'AL'
            const fullJobTitle = 'Assistant Lecturer'

            positionServiceMock.getFullJobTitle.mockResolvedValue(fullJobTitle)

            const result = await client.getFullJobTitle(originalCode)

            // Should call with the substituted code
            expect(positionServiceMock.getFullJobTitle).toHaveBeenCalledWith(substitutedCode)
            expect(positionServiceMock.getFullJobTitle).not.toHaveBeenCalledWith(originalCode)
            expect(result).toBe(fullJobTitle)
        })

        it('should handle multiple different substitutions correctly', async () => {
            // Test first substitution
            positionServiceMock.getFullJobTitle.mockResolvedValueOnce('Assistant Lecturer')
            await client.getFullJobTitle('HPAL')
            expect(positionServiceMock.getFullJobTitle).toHaveBeenNthCalledWith(1, 'AL')

            // Test second substitution
            positionServiceMock.getFullJobTitle.mockResolvedValueOnce('Senior Lecturer')
            await client.getFullJobTitle('HPSL')
            expect(positionServiceMock.getFullJobTitle).toHaveBeenNthCalledWith(2, 'SL')
        })
    })

    describe('getOptions method', () => {
        it('should return the client options', () => {
            const options = client.getOptions()
            expect(options).toEqual(defaultOptions)

            // Verify it's a copy and not the original reference
            options.titleCodeSubstitutions = {}
            expect(client.getOptions()).toEqual(defaultOptions)
        })
    })

    describe('cleanAppointments method', () => {
        it('should delegate to appointmentService.cleanAppointments', async () => {
            const staffNumber = 'S001'
            const processedAppointments: ProcessedAppointment[] = [
                {
                    appointmentId: '1',
                    primaryFlag: true,
                    jobTitle: 'Developer',
                    fullJobTitle: 'Software Developer',
                    department: 'IT',
                    fullDepartment: 'Information Technology',
                    startDate: '20230101',
                    endDate: '20231231'
                }
            ]

            // Get appointmentService mock and set up return value
            const appointmentServiceMock = (
                client as unknown as { appointmentService: jest.Mocked<AppointmentService> }
            ).appointmentService
            appointmentServiceMock.cleanAppointments.mockResolvedValue(processedAppointments)

            const result = await client.cleanAppointments(staffNumber)

            expect(appointmentServiceMock.cleanAppointments).toHaveBeenCalledWith(staffNumber)
            expect(result).toEqual(processedAppointments)
        })
    })
})
