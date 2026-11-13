import { AppointmentProcessorService } from '../src/AppointmentProcessorService'
import { RawAppointment } from '../src/AppointmentInterfaces'
import {
    createRawAppointment,
    createMergeableAppointmentPair,
    createHierarchy
} from './fixtures/AppointmentFixturesFactory'

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

        it('should preserve primaryFlag when merging appointments where later appointment is primary', () => {
            // First appointment is not primary, second is primary
            const rawAppointments = [
                createRawAppointment({
                    appointmentId: 'APP1',
                    primaryFlag: 'N',
                    startDate: '20231121',
                    endDate: '20241124',
                    jobTitle: 'ASTLE',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                }),
                createRawAppointment({
                    appointmentId: 'APP2',
                    primaryFlag: 'Y',
                    startDate: '20241125',
                    endDate: '20270831',
                    jobTitle: 'ASTLE',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                })
            ]

            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            // Should merge into single appointment with primaryFlag true
            expect(result.length).toBe(1)
            expect(result[0].primaryFlag).toBe(true)
        })

        it('should preserve primaryFlag when merging appointments where earlier appointment is primary', () => {
            // First appointment is primary, second is not
            const rawAppointments = [
                createRawAppointment({
                    appointmentId: 'APP1',
                    primaryFlag: 'Y',
                    startDate: '20231121',
                    endDate: '20241124',
                    jobTitle: 'ASTLE',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                }),
                createRawAppointment({
                    appointmentId: 'APP2',
                    primaryFlag: 'N',
                    startDate: '20241125',
                    endDate: '20270831',
                    jobTitle: 'ASTLE',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                })
            ]

            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            // Should merge into single appointment with primaryFlag true
            expect(result.length).toBe(1)
            expect(result[0].primaryFlag).toBe(true)
        })

        it('should merge contiguous appointments when titleCodeSubstitutions maps different codes to the same value', () => {
            const rawAppointments = [
                createRawAppointment({
                    appointmentId: 'APP1',
                    startDate: '20230101',
                    endDate: '20230630',
                    jobTitle: 'GL',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                }),
                createRawAppointment({
                    appointmentId: 'APP2',
                    startDate: '20230701',
                    endDate: '20231231',
                    jobTitle: 'AL',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                })
            ]

            const substitutions = { GL: 'AL' }
            const result = AppointmentProcessorService.processAppointments(rawAppointments, substitutions)

            expect(result.length).toBe(1)
            expect(result[0].jobTitle).toBe('AL')
            expect(result[0].startDate).toBe('20230101')
            expect(result[0].endDate).toBe('20231231')
        })

        it('should not merge contiguous appointments with different codes when no substitutions are provided', () => {
            const rawAppointments = [
                createRawAppointment({
                    appointmentId: 'APP1',
                    startDate: '20230101',
                    endDate: '20230630',
                    jobTitle: 'GL',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                }),
                createRawAppointment({
                    appointmentId: 'APP2',
                    startDate: '20230701',
                    endDate: '20231231',
                    jobTitle: 'AL',
                    hierarchy: { structureCode: '2', company: '1', managementUnit: 'SH', department: 'SH06', costCentre: 'DL29', division: '1', location: '77', workGroup: 'SC02', user1: '', user2: '', user3: '', user4: '', user5: '' }
                })
            ]

            const result = AppointmentProcessorService.processAppointments(rawAppointments)

            expect(result.length).toBe(2)
            expect(result[0].jobTitle).toBe('GL')
            expect(result[1].jobTitle).toBe('AL')
        })
    })

    describe('processAppointments with open-ended and malformed dates', () => {
        // Synthetic fixtures only: department/title codes and dates are illustrative.
        const appt = (
            appointmentId: string,
            startDate: string,
            endDate: string,
            primaryFlag: 'Y' | 'N' = 'N',
            jobTitle = 'TITLE_A',
            department = 'DEPT_A'
        ): RawAppointment =>
            createRawAppointment({
                appointmentId,
                startDate,
                endDate,
                primaryFlag,
                jobTitle,
                hierarchy: createHierarchy({ department })
            })

        const withoutId = (appointments: ReturnType<typeof AppointmentProcessorService.processAppointments>) =>
            appointments.map((appointment) => ({ ...appointment, appointmentId: undefined }))

        it('merges two open-ended appointments with the same start, department and title, keeping it open-ended and primary', () => {
            const result = AppointmentProcessorService.processAppointments([
                appt('A1', '20260105', '', 'N'),
                appt('A2', '20260105', '', 'Y')
            ])

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ startDate: '20260105', endDate: '', primaryFlag: true })
        })

        it('produces an equivalent result when the open-ended pair is supplied in reverse order', () => {
            const forward = AppointmentProcessorService.processAppointments([
                appt('A1', '20260105', '', 'N'),
                appt('A2', '20260105', '', 'Y')
            ])
            const reverse = AppointmentProcessorService.processAppointments([
                appt('A2', '20260105', '', 'Y'),
                appt('A1', '20260105', '', 'N')
            ])

            expect(withoutId(reverse)).toEqual(withoutId(forward))
        })

        it.each([
            ['department', 'TITLE_A', 'DEPT_B'],
            ['job title', 'TITLE_B', 'DEPT_A']
        ])('retains open-ended appointments separately when the %s differs', (_label, jobTitle, department) => {
            const result = AppointmentProcessorService.processAppointments([
                appt('A1', '20260105', '', 'N'),
                appt('A2', '20260105', '', 'Y', jobTitle, department)
            ])

            expect(result).toHaveLength(2)
            expect(result.map((a) => [a.appointmentId, a.primaryFlag, a.endDate])).toEqual([
                ['A1', false, ''],
                ['A2', true, '']
            ])
        })

        it('keeps later appointments after an open-ended appointment in another department', () => {
            const result = AppointmentProcessorService.processAppointments([
                appt('A1', '20200101', '', 'N', 'TITLE_A', 'DEPT_A'),
                appt('A2', '20210101', '20211231', 'Y', 'TITLE_A', 'DEPT_B'),
                appt('A3', '20220101', '', 'N', 'TITLE_B', 'DEPT_A')
            ])

            expect(result.map((a) => a.appointmentId)).toEqual(['A1', 'A2', 'A3'])
        })

        it.each([
            ['finite first', [appt('F', '20230101', '20231231', 'N'), appt('O', '20230601', '', 'Y')]],
            ['open-ended first', [appt('O', '20230601', '', 'Y'), appt('F', '20230101', '20231231', 'N')]]
        ])('merges an overlapping finite and later open-ended appointment (%s in input)', (_label, input) => {
            const result = AppointmentProcessorService.processAppointments(input)

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ startDate: '20230101', endDate: '', primaryFlag: true })
        })

        it.each([
            ['open-ended first', [appt('O', '20230101', '', 'N'), appt('F', '20230601', '20231231', 'Y')]],
            ['finite first', [appt('F', '20230601', '20231231', 'Y'), appt('O', '20230101', '', 'N')]]
        ])('keeps an open-ended appointment open when a later finite appointment is merged into it (%s in input)', (_label, input) => {
            const result = AppointmentProcessorService.processAppointments(input)

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ startDate: '20230101', endDate: '', primaryFlag: true })
        })

        it('merges an open-ended appointment that starts within 90 days of a finite one, and not at 91 days', () => {
            const within = AppointmentProcessorService.processAppointments([
                appt('F', '20230101', '20230331'),
                appt('O', '20230629', '')
            ])
            const beyond = AppointmentProcessorService.processAppointments([
                appt('F', '20230101', '20230331'),
                appt('O', '20230630', '')
            ])

            expect(within).toHaveLength(1)
            expect(within[0].endDate).toBe('')
            expect(beyond).toHaveLength(2)
        })

        it('keeps finite overlap and the 90/91-day boundaries unchanged', () => {
            const overlapping = AppointmentProcessorService.processAppointments([
                appt('A1', '20230101', '20230630'),
                appt('A2', '20230301', '20230531')
            ])
            expect(overlapping).toHaveLength(1)
            expect(overlapping[0]).toMatchObject({ startDate: '20230101', endDate: '20230630' })

            const ninety = AppointmentProcessorService.processAppointments([
                appt('A1', '20230101', '20230331'),
                appt('A2', '20230629', '20230930')
            ])
            expect(ninety).toHaveLength(1)
            expect(ninety[0].endDate).toBe('20230930')

            const ninetyOne = AppointmentProcessorService.processAppointments([
                appt('A1', '20230101', '20230331'),
                appt('A2', '20230630', '20230930')
            ])
            expect(ninetyOne).toHaveLength(2)
        })

        it('applies the 90-day boundary in whole calendar days across a daylight-saving change', () => {
            // 20251001 -> 20251230 is exactly 90 days and spans the October clock change in Europe/Dublin
            const result = AppointmentProcessorService.processAppointments([
                appt('A1', '20250101', '20251001'),
                appt('A2', '20251230', '20260331')
            ])
            expect(result).toHaveLength(1)
        })

        it('uses title-code substitutions when deciding whether open-ended appointments merge', () => {
            const input = [appt('A1', '20240101', '', 'N', 'CODE_X'), appt('A2', '20240301', '', 'Y', 'CODE_Y')]

            const substituted = AppointmentProcessorService.processAppointments(input, { CODE_X: 'CODE_Y' })
            expect(substituted).toHaveLength(1)
            expect(substituted[0]).toMatchObject({ jobTitle: 'CODE_Y', endDate: '', primaryFlag: true })

            const unsubstituted = AppointmentProcessorService.processAppointments(input)
            expect(unsubstituted.map((a) => a.jobTitle)).toEqual(['CODE_X', 'CODE_Y'])
        })

        it.each([
            ['missing', ''],
            ['non-numeric', 'notadate'],
            ['impossible calendar', '20230230'],
            ['trailing-text', '20230101garbage'],
            ['nine-digit', '202301011']
        ])('returns an appointment with a %s startDate unmerged without discarding valid appointments', (_label, badStart) => {
            const result = AppointmentProcessorService.processAppointments([
                appt('BAD', badStart, '', 'Y'),
                appt('A1', '20230101', '20230331'),
                appt('A2', '20230401', '')
            ])

            expect(result.map((a) => a.appointmentId)).toEqual(['A1', 'BAD'])
            expect(result[0]).toMatchObject({ startDate: '20230101', endDate: '', primaryFlag: false })
            expect(result[1]).toMatchObject({ startDate: badStart, primaryFlag: true })
        })

        it.each([
            ['non-numeric', '2023XX01'],
            ['trailing-text', '20230315garbage'],
            ['nine-digit', '202303151']
        ])('returns an appointment with a %s endDate unmerged without discarding valid appointments', (_label, badEnd) => {
            const result = AppointmentProcessorService.processAppointments([
                appt('A1', '20230101', '20230331'),
                appt('BAD', '20230201', badEnd, 'Y'),
                appt('A2', '20230401', '20230930')
            ])

            expect(result.map((a) => a.appointmentId)).toEqual(['A1', 'BAD'])
            expect(result[0]).toMatchObject({ startDate: '20230101', endDate: '20230930' })
            expect(result[1]).toMatchObject({ endDate: badEnd, primaryFlag: true })
        })
    })
})
