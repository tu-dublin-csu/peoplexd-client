import { RawAppointment, ProcessedAppointment, Hierarchy } from '../../src/AppointmentInterfaces';
/**
 * Creates a hierarchy object with default values that can be partially overridden
 */
export function createHierarchy(overrides: Partial<Hierarchy> = {}): Hierarchy {
  return {
    structureCode: 'STR001',
    company: 'ACME Inc',
    managementUnit: 'IT Department',
    department: 'Software Development',
    costCentre: 'COST123',
    division: 'Digital',
    location: 'Headquarters',
    workGroup: 'Engineering',
    user1: '',
    user2: '',
    user3: '',
    user4: '',
    user5: '',
    ...overrides
  };
}

/**
 * Creates a standard RawAppointment fixture with customizable properties
 */
export function createRawAppointment(overrides: Partial<RawAppointment> = {}): RawAppointment {
  return {
    appointmentId: '12345',
    appointmentStatus: 'ACTIVE',
    employeeStatus: 'CURRENT',
    jobDescription: 'Software Developer',
    primaryFlag: 'Y',
    category: 'FULLTIME',
    subCategory: 'PERMANENT',
    startDate: '20230101',
    endDate: '20231231',
    lastAmendedDate: '20230115',
    targetEndDate: '20231231',
    FTE: '1.0',
    contractId: 'CONT123',
    jobTitle: 'SOFTWARE_DEV',
    jobCategory: 'IT',
    project: 'CORE_SYS',
    postNumber: 'POST123',
    reasonCode: 'NEW_HIRE',
    action: 'HIRE',
    hierarchy: {
      structureCode: 'STR001',
      company: 'ACME Inc',
      managementUnit: 'IT Department',
      department: 'Software Development',
      costCentre: 'COST123',
      division: 'Digital',
      location: 'Headquarters',
      workGroup: 'Engineering',
      user1: '',
      user2: '',
      user3: '',
      user4: '',
      user5: ''
    },
    ...overrides
  };
}

/**
 * Creates a standard ProcessedAppointment fixture with customizable properties
 */
export function createProcessedAppointment(overrides: Partial<ProcessedAppointment> = {}): ProcessedAppointment {
  return {
    appointmentId: '12345',
    primaryFlag: true,
    jobTitle: 'SOFTWARE_DEV',
    fullJobTitle: 'Software Developer',
    department: 'Software Development',
    fullDepartment: 'Software Development Division',
    startDate: '20230101',
    endDate: '20231231',
    ...overrides
  };
}

/**
 * Creates multiple raw appointments for testing purposes
 * @param count Number of appointments to create
 * @param baseDate Base date for the appointments (YYYYMMDD)
 * @returns Array of raw appointments
 */
export function createSequentialRawAppointments(
  count: number, 
  baseDate: string = '20230101',
  baseProps: Partial<RawAppointment> = {}
): RawAppointment[] {
  const appointments: RawAppointment[] = [];
  
  for (let i = 0; i < count; i++) {
    // Calculate dates by adding months to the base date
    const startYear = parseInt(baseDate.substring(0, 4));
    const startMonth = parseInt(baseDate.substring(4, 6)) + (i * 3); // Add 3 months per appointment
    const startDay = baseDate.substring(6, 8);
    
    let adjustedYear = startYear + Math.floor((startMonth - 1) / 12);
    let adjustedMonth = ((startMonth - 1) % 12) + 1;
    
    const formattedMonth = adjustedMonth.toString().padStart(2, '0');
    const startDate = `${adjustedYear}${formattedMonth}${startDay}`;
    
    // End date is 3 months after start
    adjustedMonth = adjustedMonth + 2;
    if (adjustedMonth > 12) {
      adjustedYear += 1;
      adjustedMonth -= 12;
    }
    const formattedEndMonth = adjustedMonth.toString().padStart(2, '0');
    const endDate = `${adjustedYear}${formattedEndMonth}${startDay}`;
    
    appointments.push(createRawAppointment({
      appointmentId: `APP${i + 1}`,
      startDate,
      endDate,
      ...baseProps
    }));
  }
  
  return appointments;
}

/**
 * Creates a pair of appointments for testing merging logic
 */
export function createMergeableAppointmentPair(
  shouldMerge: boolean = true,
  daysBetween: number = 1
): RawAppointment[] {
  const firstAppointment = createRawAppointment({
    appointmentId: 'APP1',
    startDate: '20230101',
    endDate: '20230331',
    jobTitle: 'SOFTWARE_DEV',
    hierarchy: {
      ...createRawAppointment().hierarchy,
      department: 'Software Development'
    }
  });
  
  // Calculate second appointment start date based on daysBetween
  const firstEndDate = new Date(
    parseInt(firstAppointment.endDate.substring(0, 4)),
    parseInt(firstAppointment.endDate.substring(4, 6)) - 1,
    parseInt(firstAppointment.endDate.substring(6, 8))
  );
  
  const secondStartDate = new Date(firstEndDate);
  secondStartDate.setDate(secondStartDate.getDate() + daysBetween);
  
  const formattedSecondStartDate = secondStartDate.toISOString().split('T')[0].replace(/-/g, '');
  
  // Calculate second appointment end date (3 months after start)
  const secondEndDate = new Date(secondStartDate);
  secondEndDate.setMonth(secondEndDate.getMonth() + 3);
  
  const formattedSecondEndDate = secondEndDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const secondAppointment = createRawAppointment({
    appointmentId: 'APP2',
    startDate: formattedSecondStartDate,
    endDate: formattedSecondEndDate,
    // If shouldMerge is false, change either job title or department
    ...(shouldMerge ? {} : Math.random() > 0.5 ? 
      { jobTitle: 'MANAGER' } : 
      { hierarchy: { ...firstAppointment.hierarchy, department: 'Human Resources' } }
    )
  });
  
  return [firstAppointment, secondAppointment];
}