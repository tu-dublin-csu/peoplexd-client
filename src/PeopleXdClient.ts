import { AxiosResponse } from 'axios'
import { TokenManagerService } from './TokenManagerService'
import { ProcessedAppointment } from './AppointmentInterfaces'
import { HttpClient } from './HttpClient'
import { AppointmentService } from './AppointmentService'
import { DepartmentService } from './DepartmentService'
import { PositionService } from './PositionService'

export enum HttpRequestMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete'
}

/**
 * Configuration options for PeopleXdClient
 */
export interface PeopleXdClientOptions {
    /**
     * Map of position codes to their substitutions
     * Example: { 'HPAL': 'AL' } would replace "Hourly Paid Assistant Lecturer" with "Assistant Lecturer"
     */
    titleCodeSubstitutions?: Record<string, string>
}

/**
 * PeopleXdClient class to interact with the PeopleXD API.
 */
export class PeopleXdClient {
    private httpClient: HttpClient
    private appointmentService: AppointmentService
    private departmentService: DepartmentService
    private positionService: PositionService
    private options: PeopleXdClientOptions
    static tokenManager: TokenManagerService

    private constructor(httpClient: HttpClient, options: PeopleXdClientOptions = {}) {
        this.httpClient = httpClient
        this.options = options
        this.appointmentService = new AppointmentService(this)
        this.departmentService = new DepartmentService(this)
        this.positionService = new PositionService(this)
    }

    static async new(
        url: string,
        clientId: string,
        clientSecret: string,
        options: PeopleXdClientOptions = {}
    ): Promise<PeopleXdClient> {
        this.tokenManager = await TokenManagerService.new(url, clientId, clientSecret)
        await this.tokenManager.useOrFetchToken()
        const httpClient = new HttpClient(url, this.tokenManager)
        return new PeopleXdClient(httpClient, options)
    }

    public async request(
        method: string,
        endpoint: string,
        body: Record<string, unknown> | null = null
    ): Promise<AxiosResponse> {
        return await this.httpClient.request(method, endpoint, body)
    }

    public async getFullDepartment(deptCode: string): Promise<string> {
        return await this.departmentService.getFullDepartment(deptCode)
    }

    public async getFullJobTitle(positionCode: string): Promise<string> {
        // Apply code substitution if one exists
        const substitutedCode = this.options.titleCodeSubstitutions?.[positionCode] || positionCode
        return await this.positionService.getFullJobTitle(substitutedCode)
    }

    public async cleanAppointments(staffNumber: string): Promise<ProcessedAppointment[]> {
        return await this.appointmentService.cleanAppointments(staffNumber)
    }

    /**
     * Get the client configuration options
     */
    public getOptions(): PeopleXdClientOptions {
        return this.options
    }
}
