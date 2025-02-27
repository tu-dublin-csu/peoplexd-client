import { AppointmentProcessorService } from '../src/AppointmentProcessorService'
import { createRawAppointment, createMergeableAppointmentPair } from './fixtures/AppointmentFixturesFactory'

describe('AppointmentProcessorService', () => {
    describe('processAppointments', () => {
        it('should return an empty array when input is empty', () => {
            expect(AppointmentProcessorService.processAppointments([])).toEqual([])
            expect(
                AppointmentProcessorService.processAppointments(
                    undefined as unknown as Array<ReturnType<typeof createRawAppointment>>
                )
            ).toEqual([])
        })

        it('should process a single appointment correctly', () => {
            const rawAppointments = [createRawAppointment()]
            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            expect(result.length).toBe(1)
            expect(result[0].appointmentId).toEqual(rawAppointments[0].appointmentId)
            expect(result[0].primaryFlag).toBe(rawAppointments[0].primaryFlag === 'Y')
            expect(result[0].jobTitle).toEqual(rawAppointments[0].jobTitle)
            expect(result[0].department).toEqual(rawAppointments[0].hierarchy.department)
        })

        it('should merge contiguous appointments with same job title and department', () => {
            const rawAppointments = createMergeableAppointmentPair(true, 1)
            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            // Should merge into a single appointment
            expect(result.length).toBe(1)
            expect(result[0].startDate).toBe(rawAppointments[0].startDate)
            expect(result[0].endDate).toBe(rawAppointments[1].endDate)
        })

        it('should not merge appointments with different job titles or departments', () => {
            const rawAppointments = createMergeableAppointmentPair(false, 1)
            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            // Should not merge
            expect(result.length).toBe(2)
        })

        it('should merge appointments within 90 days of each other', () => {
            const rawAppointments = createMergeableAppointmentPair(true, 90)
            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            // Should merge into a single appointment
            expect(result.length).toBe(1)
        })

        it('should not merge appointments more than 90 days apart', () => {
            const rawAppointments = createMergeableAppointmentPair(true, 91)
            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            // Should not merge
            expect(result.length).toBe(2)
        })
    })
})
