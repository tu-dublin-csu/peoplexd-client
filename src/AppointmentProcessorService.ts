import { RawAppointment, ProcessedAppointment } from './AppointmentInterfaces'
import { log, LogType } from './Utilities'
export { ProcessedAppointment }

const MERGE_GAP_DAYS = 90
const MS_PER_DAY = 1000 * 60 * 60 * 24

export class AppointmentProcessorService {
    /**
     * Processes raw appointment data to extract selected keys and merge contiguous or overlapping appointments with the same jobTitle and department.
     * Appointments within 90 days of each other or overlapping are considered contiguous.
     * An empty endDate denotes an ongoing (open-ended) appointment; it overlaps every appointment that starts after it.
     * Appointments with a missing/invalid startDate, or a non-empty but invalid endDate, cannot be placed on the
     * timeline: they are excluded from merging and returned unmerged after the valid appointments, rather than dropped.
     * @param rawAppointments - The raw appointment data.
     * @returns The processed appointment data.
     */
    public static processAppointments(
        rawAppointments: RawAppointment[],
        titleCodeSubstitutions: Record<string, string> = {}
    ): ProcessedAppointment[] {
        if (!rawAppointments || rawAppointments.length === 0) {
            return []
        }

        const datedAppointments: RawAppointment[] = []
        const undatedAppointments: RawAppointment[] = []
        for (const rawAppointment of rawAppointments) {
            if (this.hasValidDates(rawAppointment)) {
                datedAppointments.push(rawAppointment)
            } else {
                log(
                    LogType.WARN,
                    `Appointment ${rawAppointment.appointmentId} has an invalid startDate (${JSON.stringify(rawAppointment.startDate)}) ` +
                        `or endDate (${JSON.stringify(rawAppointment.endDate)}); returning it unmerged`
                )
                undatedAppointments.push(rawAppointment)
            }
        }

        // Sort appointments by startDate without mutating the caller's array (stable for equal start dates)
        const sortedAppointments = datedAppointments.sort(
            (a, b) => this.toDayNumber(a.startDate) - this.toDayNumber(b.startDate)
        )

        log(LogType.LOG, 'Processing appointments...')

        const mergedAppointments = this.mergeAppointments(sortedAppointments, titleCodeSubstitutions)

        for (const undatedAppointment of undatedAppointments) {
            mergedAppointments.push(this.createProcessedAppointment(undatedAppointment, titleCodeSubstitutions))
        }

        return mergedAppointments
    }

    private static mergeAppointments(
        sortedAppointments: RawAppointment[],
        titleCodeSubstitutions: Record<string, string> = {}
    ): ProcessedAppointment[] {
        const mergedAppointments: ProcessedAppointment[] = []
        if (sortedAppointments.length === 0) {
            return mergedAppointments
        }

        let currentAppointment = this.createProcessedAppointment(sortedAppointments[0], titleCodeSubstitutions)

        for (let i = 1; i < sortedAppointments.length; i++) {
            const nextAppointment = sortedAppointments[i]

            log(LogType.LOG, `Processing appointment ${i + 1} of ${sortedAppointments.length}`)

            const daysDifference = this.calculateDaysDifference(currentAppointment.endDate, nextAppointment.startDate)

            log(LogType.LOG, `Days difference: ${daysDifference}`)

            if (
                this.shouldMergeAppointments(
                    currentAppointment,
                    nextAppointment,
                    daysDifference,
                    titleCodeSubstitutions
                )
            ) {
                log(LogType.LOG, 'Merging appointments...')
                currentAppointment = this.mergeTwoAppointments(currentAppointment, nextAppointment)
            } else {
                mergedAppointments.push(currentAppointment)
                currentAppointment = this.createProcessedAppointment(nextAppointment, titleCodeSubstitutions)
            }
        }

        mergedAppointments.push(currentAppointment)
        return mergedAppointments
    }

    private static isOpenEnded(endDate: string | null | undefined): boolean {
        return endDate === null || endDate === undefined || endDate.trim() === ''
    }

    /**
     * Parses a YYYYMMDD date into a whole UTC day number, or null if missing or not a real calendar date.
     * UTC is used so that day differences are exact integers regardless of the host time zone / DST.
     */
    private static parseDayNumber(dateString: string | null | undefined): number | null {
        if (typeof dateString !== 'string') {
            return null
        }
        const match = /^(\d{4})(\d{2})(\d{2})/.exec(dateString.trim())
        if (!match) {
            return null
        }
        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10) - 1 // Months are 0-based in JavaScript
        const day = parseInt(match[3], 10)
        const date = new Date(Date.UTC(year, month, day))
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
            return null
        }
        return date.getTime() / MS_PER_DAY
    }

    private static toDayNumber(dateString: string): number {
        const dayNumber = this.parseDayNumber(dateString)
        if (dayNumber === null) {
            throw new Error(`Invalid appointment date: ${JSON.stringify(dateString)}`)
        }
        return dayNumber
    }

    private static hasValidDates(rawAppointment: RawAppointment): boolean {
        if (this.parseDayNumber(rawAppointment.startDate) === null) {
            return false
        }
        return this.isOpenEnded(rawAppointment.endDate) || this.parseDayNumber(rawAppointment.endDate) !== null
    }

    /**
     * Days from the end of the current appointment to the start of the next one.
     * Negative values mean the appointments overlap; an open-ended current appointment overlaps everything after it.
     */
    private static calculateDaysDifference(endDate: string, startDate: string): number {
        if (this.isOpenEnded(endDate)) {
            return Number.NEGATIVE_INFINITY
        }
        return this.toDayNumber(startDate) - this.toDayNumber(endDate)
    }

    private static shouldMergeAppointments(
        currentAppointment: ProcessedAppointment,
        nextAppointment: RawAppointment,
        daysDifference: number,
        titleCodeSubstitutions: Record<string, string> = {}
    ): boolean {
        const nextJobTitle = titleCodeSubstitutions[nextAppointment.jobTitle] ?? nextAppointment.jobTitle
        return (
            currentAppointment.jobTitle === nextJobTitle &&
            currentAppointment.department === nextAppointment.hierarchy.department &&
            daysDifference <= MERGE_GAP_DAYS
        ) // Merge if within 90 days or overlapping
    }

    private static createProcessedAppointment(
        rawAppointment: RawAppointment,
        titleCodeSubstitutions: Record<string, string> = {}
    ): ProcessedAppointment {
        const normalisedJobTitle = titleCodeSubstitutions[rawAppointment.jobTitle] ?? rawAppointment.jobTitle
        return {
            appointmentId: rawAppointment.appointmentId,
            primaryFlag: rawAppointment.primaryFlag === 'Y',
            jobTitle: normalisedJobTitle,
            fullJobTitle: normalisedJobTitle,
            department: rawAppointment.hierarchy.department,
            fullDepartment: rawAppointment.hierarchy.department,
            startDate: rawAppointment.startDate,
            endDate: rawAppointment.endDate
        }
    }

    /** Returns the later of two end dates; an open-ended (empty) end date is later than any finite date. */
    private static getLaterDate(date1: string, date2: string): string {
        if (this.isOpenEnded(date1)) {
            return date1
        }
        if (this.isOpenEnded(date2)) {
            return date2
        }
        return this.toDayNumber(date1) > this.toDayNumber(date2) ? date1 : date2
    }

    private static mergeTwoAppointments(
        currentAppointment: ProcessedAppointment,
        nextAppointment: RawAppointment
    ): ProcessedAppointment {
        currentAppointment.endDate = this.getLaterDate(currentAppointment.endDate, nextAppointment.endDate)
        currentAppointment.primaryFlag = currentAppointment.primaryFlag || nextAppointment.primaryFlag === 'Y'
        return currentAppointment
    }
}
