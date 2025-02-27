import { RawAppointment, ProcessedAppointment } from './AppointmentInterfaces'
export { ProcessedAppointment }

export class AppointmentProcessorService {
    /**
     * Processes raw appointment data to extract selected keys and merge contiguous or overlapping appointments with the same jobTitle and department.
     * Appointments within 90 days of each other or overlapping are considered contiguous.
     * @param rawAppointments - The raw appointment data.
     * @returns The processed appointment data.
     */
    public static processAppointments(rawAppointments: RawAppointment[]): ProcessedAppointment[] {
        if (!rawAppointments || rawAppointments.length === 0) {
            return []
        }

        // Sort appointments by startDate
        rawAppointments.sort((a, b) => this.parseDate(a.startDate).getTime() - this.parseDate(b.startDate).getTime())

        const mergedAppointments: ProcessedAppointment[] = []
        const currentAppointment = this.createProcessedAppointment(rawAppointments[0])

        console.log('Processing appointments...')

        this.mergeAppointments(rawAppointments, mergedAppointments, currentAppointment)

        return mergedAppointments
    }

    private static mergeAppointments(
        rawAppointments: RawAppointment[],
        mergedAppointments: ProcessedAppointment[],
        currentAppointment: ProcessedAppointment
    ): void {
        for (let i = 1; i < rawAppointments.length; i++) {
            const nextAppointment = rawAppointments[i]

            console.log(`Processing appointment ${i + 1} of ${rawAppointments.length}`)

            if (this.shouldSkipAppointment(currentAppointment, nextAppointment)) {
                continue
            }

            const daysDifference = this.calculateDaysDifference(currentAppointment.endDate, nextAppointment.startDate)

            console.log(`Days difference: ${daysDifference}`)

            if (this.shouldMergeAppointments(currentAppointment, nextAppointment, daysDifference)) {
                console.log('Merging appointments...')
                currentAppointment = this.mergeTwoAppointments(currentAppointment, nextAppointment)
            } else {
                mergedAppointments.push(currentAppointment)
                currentAppointment = this.createProcessedAppointment(nextAppointment)
            }
        }

        mergedAppointments.push(currentAppointment)
    }

    private static parseDate(dateString: string): Date {
        const year = parseInt(dateString.substring(0, 4), 10)
        const month = parseInt(dateString.substring(4, 6), 10) - 1 // Months are 0-based in JavaScript
        const day = parseInt(dateString.substring(6, 8), 10)
        return new Date(year, month, day)
    }

    private static calculateDaysDifference(endDate: string, startDate: string): number {
        const currentEndDate = this.parseDate(endDate)
        const nextStartDate = this.parseDate(startDate)
        return (nextStartDate.getTime() - currentEndDate.getTime()) / (1000 * 3600 * 24)
    }

    private static shouldMergeAppointments(
        currentAppointment: ProcessedAppointment,
        nextAppointment: RawAppointment,
        daysDifference: number
    ): boolean {
        return (
            currentAppointment.jobTitle === nextAppointment.jobTitle &&
            currentAppointment.department === nextAppointment.hierarchy.department &&
            (daysDifference <= 90 || daysDifference < 0)
        ) // Merge if within 90 days or overlapping
    }

    private static createProcessedAppointment(rawAppointment: RawAppointment): ProcessedAppointment {
        return {
            appointmentId: rawAppointment.appointmentId,
            primaryFlag: rawAppointment.primaryFlag === 'Y',
            jobTitle: rawAppointment.jobTitle,
            fullJobTitle: rawAppointment.jobTitle,
            department: rawAppointment.hierarchy.department,
            fullDepartment: rawAppointment.hierarchy.department,
            startDate: rawAppointment.startDate,
            endDate: rawAppointment.endDate
        }
    }

    private static getLaterDate(date1: string, date2: string): string {
        const parsedDate1 = this.parseDate(date1)
        const parsedDate2 = this.parseDate(date2)
        return parsedDate1 > parsedDate2 ? date1 : date2
    }

    private static shouldSkipAppointment(
        currentAppointment: ProcessedAppointment,
        nextAppointment: RawAppointment
    ): boolean {
        if (!currentAppointment.endDate || !nextAppointment.startDate) {
            console.warn('Skipping appointment due to missing startDate or endDate')
            return true
        }
        return false
    }

    private static mergeTwoAppointments(
        currentAppointment: ProcessedAppointment,
        nextAppointment: RawAppointment
    ): ProcessedAppointment {
        currentAppointment.endDate = this.getLaterDate(currentAppointment.endDate, nextAppointment.endDate)
        return currentAppointment
    }
}
