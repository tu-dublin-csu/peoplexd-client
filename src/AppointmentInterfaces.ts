export interface Hierarchy {
    structureCode: string
    company: string
    managementUnit: string
    department: string
    costCentre: string
    division: string
    location: string
    workGroup: string
    user1: string
    user2: string
    user3: string
    user4: string
    user5: string
}

export interface RawAppointment {
    appointmentId: string
    appointmentStatus: string
    employeeStatus: string
    jobDescription: string
    primaryFlag: string
    category: string
    subCategory: string
    startDate: string
    endDate: string
    lastAmendedDate: string
    targetEndDate: string
    FTE: string
    contractId: string
    jobTitle: string
    jobCategory: string
    project: string
    postNumber: string
    reasonCode: string
    action: string
    hierarchy: Hierarchy
}

export interface ProcessedAppointment {
    appointmentId: string
    primaryFlag: boolean
    jobTitle: string
    fullJobTitle: string
    department: string
    fullDepartment: string
    startDate: string
    endDate: string
}
