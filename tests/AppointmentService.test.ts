import { AxiosResponse, AxiosHeaders } from 'axios'
import { AppointmentService } from '../src/AppointmentService'
import { PeopleXdClient } from '../src/PeopleXdClient'
import { AppointmentProcessorService } from '../src/AppointmentProcessorService'
import { RawAppointment, ProcessedAppointment } from '../src/AppointmentInterfaces'
import {
    createRawAppointment,
    createProcessedAppointment,
    createHierarchy
} from './fixtures/AppointmentFixturesFactory'

// Mock dependencies
jest.mock('../src/PeopleXdClient')
jest.mock('../src/AppointmentProcessorService')

describe('AppointmentService', () => {
    let client: jest.Mocked<PeopleXdClient>
    let appointmentService: AppointmentService
    const staffNumber = '12345'

    beforeEach(() => {
        // Create a mock PeopleXdClient
        client = {
            request: jest.fn(),
            getFullDepartment: jest.fn(),
            getFullJobTitle: jest.fn()
        } as unknown as jest.Mocked<PeopleXdClient>

        // Create an instance of AppointmentService with the mock client
        appointmentService = new AppointmentService(client)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getAppointments', () => {
        it('should fetch appointments for a staff number', async () => {
            // Sample raw appointments to be returned by the API
            const rawAppointments: RawAppointment[] = [
                createRawAppointment({ appointmentId: 'APP1' }),
                createRawAppointment({ appointmentId: 'APP2' })
            ]

            // Mock response from the client request
            const mockResponse: AxiosResponse = {
                data: { items: rawAppointments },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup the mock
            client.request.mockResolvedValue(mockResponse)

            // Call the method
            const result = await appointmentService.getAppointments(staffNumber)

            // Verify the client request was called with the correct parameters
            expect(client.request).toHaveBeenCalledWith('GET', `v1/person/appointment/${staffNumber}`)

            // Verify the result
            expect(result).toEqual(rawAppointments)
            expect(result.length).toBe(2)
            expect(result[0].appointmentId).toBe('APP1')
            expect(result[1].appointmentId).toBe('APP2')
        })

        it('should handle empty response', async () => {
            // Mock response with no appointments
            const mockResponse: AxiosResponse = {
                data: { items: [] },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: new AxiosHeaders() }
            }

            // Setup the mock
            client.request.mockResolvedValue(mockResponse)

            // Call the method
            const result = await appointmentService.getAppointments(staffNumber)

            // Verify the result
            expect(result).toEqual([])
            expect(result.length).toBe(0)
        })

        it('should handle errors from the API', async () => {
            // Mock an error response
            const errorMessage = 'API Error'
            client.request.mockRejectedValue(new Error(errorMessage))

            // Expect the method to throw the error
            await expect(appointmentService.getAppointments(staffNumber)).rejects.toThrow(errorMessage)
        })
    })

    describe('cleanAppointments', () => {
        it('should process and enrich appointments with full department and job title', async () => {
            // Sample raw appointments
            const rawAppointments: RawAppointment[] = [
                createRawAppointment({
                    appointmentId: 'APP1',
                    jobTitle: 'DEV',
                    hierarchy: createHierarchy({ department: 'IT' })
                })
            ]

            // Sample processed appointments (after AppointmentProcessorService)
            const processedAppointments: ProcessedAppointment[] = [
                createProcessedAppointment({
                    appointmentId: 'APP1',
                    jobTitle: 'DEV',
                    department: 'IT'
                })
            ]

            // Expected final result
            const expectedResult: ProcessedAppointment[] = [
                {
                    ...processedAppointments[0],
                    fullJobTitle: 'Software Developer',
                    fullDepartment: 'Information Technology Department'
                }
            ]

            // Setup mocks
            jest.spyOn(appointmentService, 'getAppointments').mockResolvedValue(rawAppointments)
            ;(AppointmentProcessorService.processAppointments as jest.Mock).mockReturnValue(processedAppointments)
            client.getFullDepartment.mockResolvedValue('Information Technology Department')
            client.getFullJobTitle.mockResolvedValue('Software Developer')

            // Call the method
            const result = await appointmentService.cleanAppointments(staffNumber)

            // Verify method calls
            expect(appointmentService.getAppointments).toHaveBeenCalledWith(staffNumber)
            expect(AppointmentProcessorService.processAppointments).toHaveBeenCalledWith(rawAppointments)
            expect(client.getFullDepartment).toHaveBeenCalledWith('IT')
            expect(client.getFullJobTitle).toHaveBeenCalledWith('DEV')

            // Verify result
            expect(result).toEqual(expectedResult)
            expect(result[0].fullJobTitle).toBe('Software Developer')
            expect(result[0].fullDepartment).toBe('Information Technology Department')
        })

        it('should handle multiple appointments correctly', async () => {
            // Sample raw appointments
            const rawAppointments: RawAppointment[] = [
                createRawAppointment({
                    appointmentId: 'APP1',
                    jobTitle: 'DEV',
                    hierarchy: createHierarchy({ department: 'IT' })
                }),
                createRawAppointment({
                    appointmentId: 'APP2',
                    jobTitle: 'MGR',
                    hierarchy: createHierarchy({ department: 'HR' })
                })
            ]

            // Sample processed appointments (after merging/processing)
            const processedAppointments: ProcessedAppointment[] = [
                createProcessedAppointment({
                    appointmentId: 'APP1',
                    jobTitle: 'DEV',
                    department: 'IT'
                }),
                createProcessedAppointment({
                    appointmentId: 'APP2',
                    jobTitle: 'MGR',
                    department: 'HR'
                })
            ]

            // Setup mocks
            jest.spyOn(appointmentService, 'getAppointments').mockResolvedValue(rawAppointments)
            ;(AppointmentProcessorService.processAppointments as jest.Mock).mockReturnValue(processedAppointments)

            // Mock different responses for different departments/job titles
            client.getFullDepartment.mockImplementation((dept) => {
                if (dept === 'IT') return Promise.resolve('Information Technology Department')
                if (dept === 'HR') return Promise.resolve('Human Resources Department')
                return Promise.resolve(dept)
            })

            client.getFullJobTitle.mockImplementation((title) => {
                if (title === 'DEV') return Promise.resolve('Software Developer')
                if (title === 'MGR') return Promise.resolve('Manager')
                return Promise.resolve(title)
            })

            // Call the method
            const result = await appointmentService.cleanAppointments(staffNumber)

            // Verify method calls
            expect(appointmentService.getAppointments).toHaveBeenCalledWith(staffNumber)
            expect(AppointmentProcessorService.processAppointments).toHaveBeenCalledWith(rawAppointments)

            // Verify result
            expect(result.length).toBe(2)
            expect(result[0].fullJobTitle).toBe('Software Developer')
            expect(result[0].fullDepartment).toBe('Information Technology Department')
            expect(result[1].fullJobTitle).toBe('Manager')
            expect(result[1].fullDepartment).toBe('Human Resources Department')
        })

        it('should handle empty results correctly', async () => {
            // Setup mocks for empty results
            jest.spyOn(appointmentService, 'getAppointments').mockResolvedValue([])
            ;(AppointmentProcessorService.processAppointments as jest.Mock).mockReturnValue([])

            // Call the method
            const result = await appointmentService.cleanAppointments(staffNumber)

            // Verify result
            expect(result).toEqual([])
            expect(result.length).toBe(0)
            expect(client.getFullDepartment).not.toHaveBeenCalled()
            expect(client.getFullJobTitle).not.toHaveBeenCalled()
        })
    })
})
