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
        const departmentCache = new Map<string, string>()
        const jobTitleCache = new Map<string, string>()

        const cleanedAppointments = AppointmentProcessorService.processAppointments(rawAppointments)

        for (const cleanedAppointment of cleanedAppointments) {
            const fullDepartment = departmentCache.get(cleanedAppointment.department)
                ?? (await this.client.getFullDepartment(cleanedAppointment.department))
            departmentCache.set(cleanedAppointment.department, fullDepartment)

            const fullJobTitle = jobTitleCache.get(cleanedAppointment.jobTitle)
                ?? (await this.client.getFullJobTitle(cleanedAppointment.jobTitle))
            jobTitleCache.set(cleanedAppointment.jobTitle, fullJobTitle)

            processedAppointments.push({
                appointmentId: cleanedAppointment.appointmentId,
                primaryFlag: cleanedAppointment.primaryFlag,
                jobTitle: cleanedAppointment.jobTitle,
                fullJobTitle: fullJobTitle,
                department: cleanedAppointment.department,
                fullDepartment: fullDepartment,
                startDate: cleanedAppointment.startDate,
                endDate: cleanedAppointment.endDate
            })
        }

        return processedAppointments
    }
}
