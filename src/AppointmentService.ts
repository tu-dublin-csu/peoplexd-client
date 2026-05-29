import { RawAppointment, ProcessedAppointment } from './AppointmentInterfaces'
import { AppointmentProcessorService } from './AppointmentProcessorService'
import { PeopleXdClient } from './PeopleXdClient'

export class AppointmentService {
    private client: PeopleXdClient

    constructor(client: PeopleXdClient) {
        this.client = client
    }

    public async getAppointments(staffNumber: string): Promise<RawAppointment[]> {
        const response = await this.client.request('GET', `v1/person/appointment/${staffNumber}`)
        return response.data.items as RawAppointment[]
    }

    public async cleanAppointments(staffNumber: string): Promise<ProcessedAppointment[]> {
        const rawAppointments = await this.getAppointments(staffNumber)
        const processedAppointments: ProcessedAppointment[] = []
        const departmentCache = new Map<string, { fullDepartment: string; missing: boolean }>()
        const jobTitleCache = new Map<string, string>()

        const options = this.client.getOptions()
        const tolerateMissing = options.tolerateMissingReferenceData === true
        const titleCodeSubstitutions = options.titleCodeSubstitutions ?? {}
        const cleanedAppointments = AppointmentProcessorService.processAppointments(rawAppointments, titleCodeSubstitutions)

        for (const cleanedAppointment of cleanedAppointments) {
            let deptEntry = departmentCache.get(cleanedAppointment.department)
            if (!deptEntry) {
                deptEntry = await this.resolveDepartment(cleanedAppointment.department, tolerateMissing)
                departmentCache.set(cleanedAppointment.department, deptEntry)
            }

            const fullJobTitle = jobTitleCache.get(cleanedAppointment.jobTitle)
                ?? (await this.client.getFullJobTitle(cleanedAppointment.jobTitle))
            jobTitleCache.set(cleanedAppointment.jobTitle, fullJobTitle)

            const appointment: ProcessedAppointment = {
                appointmentId: cleanedAppointment.appointmentId,
                primaryFlag: cleanedAppointment.primaryFlag,
                jobTitle: cleanedAppointment.jobTitle,
                fullJobTitle: fullJobTitle,
                department: cleanedAppointment.department,
                fullDepartment: deptEntry.fullDepartment,
                startDate: cleanedAppointment.startDate,
                endDate: cleanedAppointment.endDate
            }
            if (deptEntry.missing) {
                appointment.fullDepartmentMissing = true
            }
            processedAppointments.push(appointment)
        }

        return processedAppointments
    }

    private async resolveDepartment(
        deptCode: string,
        tolerateMissing: boolean
    ): Promise<{ fullDepartment: string; missing: boolean }> {
        if (!tolerateMissing) {
            return { fullDepartment: await this.client.getFullDepartment(deptCode), missing: false }
        }

        const reference = await this.client.getDepartmentReference(deptCode)
        if (reference) {
            return { fullDepartment: reference.description, missing: false }
        }
        return { fullDepartment: deptCode, missing: true }
    }
}
