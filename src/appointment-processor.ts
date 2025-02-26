import { debug } from "console";

interface Hierarchy {
    structureCode: string;
    company: string;
    managementUnit: string;
    department: string;
    costCentre: string;
    division: string;
    location: string;
    workGroup: string;
    user1: string;
    user2: string;
    user3: string;
    user4: string;
    user5: string;
}

interface RawAppointment {
    appointmentId: string;
    appointmentStatus: string;
    employeeStatus: string;
    jobDescription: string;
    primaryFlag: string;
    category: string;
    subCategory: string;
    startDate: string;
    endDate: string;
    lastAmendedDate: string;
    targetEndDate: string;
    FTE: string;
    contractId: string;
    jobTitle: string;
    jobCategory: string;
    project: string;
    postNumber: string;
    reasonCode: string;
    action: string;
    hierarchy: Hierarchy;
}

interface ProcessedAppointment {
    appointmentId: string;
    primaryFlag: boolean;
    jobTitle: string;
    fullJobTitle: string;
    department: string;
    fullDepartment: string;
    startDate: string;
    endDate: string;
}

class AppointmentProcessor {
    /**
     * Processes raw appointment data to extract selected keys and merge contiguous appointments with the same jobTitle and department.
     * Appointments within 90 days of each other are considered contiguous.
     * @param rawAppointments - The raw appointment data.
     * @returns The processed appointment data.
     */
    public static processAppointments(rawAppointments: RawAppointment[]): ProcessedAppointment[] {
        if (!rawAppointments || rawAppointments.length === 0) {
            return [];
        }

        // Helper function to parse dates in YYYYMMDD format
        const parseDate = (dateString: string): Date => {
            const year = parseInt(dateString.substring(0, 4), 10);
            const month = parseInt(dateString.substring(4, 6), 10) - 1; // Months are 0-based in JavaScript
            const day = parseInt(dateString.substring(6, 8), 10);
            return new Date(year, month, day);
        };

        // Sort appointments by startDate
        rawAppointments.sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

        const mergedAppointments: ProcessedAppointment[] = [];
        let currentAppointment: ProcessedAppointment = {
            appointmentId: rawAppointments[0].appointmentId,
            primaryFlag: rawAppointments[0].primaryFlag === 'Y',
            jobTitle: rawAppointments[0].jobTitle,
            fullJobTitle: rawAppointments[0].jobTitle,
            department: rawAppointments[0].hierarchy.department,
            fullDepartment: rawAppointments[0].hierarchy.department,
            startDate: rawAppointments[0].startDate,
            endDate: rawAppointments[0].endDate
        };

        console.log('Processing appointments...');

        for (let i = 1; i < rawAppointments.length; i++) {
            const nextAppointment = rawAppointments[i];

            console.log(`Processing appointment ${i + 1} of ${rawAppointments.length}`);

            const currentEndDate = parseDate(currentAppointment.endDate);
            const nextStartDate = parseDate(nextAppointment.startDate);
            const daysDifference = (nextStartDate.getTime() - currentEndDate.getTime()) / (1000 * 3600 * 24);

            console.log(currentEndDate, nextStartDate, daysDifference);

            if (currentAppointment.jobTitle === nextAppointment.jobTitle &&
                currentAppointment.department === nextAppointment.hierarchy.department &&
                daysDifference <= 90) {
                console.log('Merging appointments...');
                // Merge appointments by updating the endDate
                currentAppointment.endDate = nextAppointment.endDate;
            } else {
                // Push the current appointment and move to the next
                mergedAppointments.push(currentAppointment);
                currentAppointment = {
                    appointmentId: nextAppointment.appointmentId,
                    primaryFlag: nextAppointment.primaryFlag === 'Y',
                    jobTitle: nextAppointment.jobTitle,
                    fullJobTitle: nextAppointment.jobTitle,
                    department: nextAppointment.hierarchy.department,
                    fullDepartment: nextAppointment.hierarchy.department,
                    startDate: nextAppointment.startDate,
                    endDate: nextAppointment.endDate
                };
            }
        }

        // Push the last appointment
        mergedAppointments.push(currentAppointment);

        return mergedAppointments;
    }
}

export { AppointmentProcessor, RawAppointment, ProcessedAppointment };