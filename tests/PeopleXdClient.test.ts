import { AxiosResponse, AxiosHeaders } from 'axios';
import { PeopleXdClient } from '../src/PeopleXdClient';
import { TokenManagerService } from '../src/TokenManagerService';
import { HttpClient } from '../src/HttpClient';
import { AppointmentService } from '../src/AppointmentService';
import { DepartmentService } from '../src/DepartmentService';
import { PositionService } from '../src/PositionService';
import { ProcessedAppointment } from '../src/AppointmentInterfaces';

jest.mock('../src/TokenManagerService');
jest.mock('../src/HttpClient');
jest.mock('../src/AppointmentService');
jest.mock('../src/DepartmentService');
jest.mock('../src/PositionService');

describe('PeopleXdClient', () => {
  const url = 'https://api.example.com/';
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';
  const token = 'test-token';
  let client: PeopleXdClient;
  let httpClientMock: jest.Mocked<HttpClient>;

  beforeEach(async () => {
    // Mock TokenManagerService.new and useOrFetchToken
    (TokenManagerService.new as jest.Mock).mockResolvedValue({
      useOrFetchToken: jest.fn().mockResolvedValue(token)
    });

    // Create a new instance of PeopleXdClient
    client = await PeopleXdClient.new(url, clientId, clientSecret);
    
    // Cast httpClient to mocked version to access mock methods
    httpClientMock = (client as any).httpClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('new static method', () => {
    it('should initialize PeopleXdClient with proper dependencies', async () => {
      // Verify TokenManagerService was initialized correctly
      expect(TokenManagerService.new).toHaveBeenCalledWith(url, clientId, clientSecret);
      
      // Verify the token was requested
      expect(PeopleXdClient.tokenManager.useOrFetchToken).toHaveBeenCalled();
      
      // Verify HttpClient was constructed with correct parameters
      expect(HttpClient).toHaveBeenCalledWith(url, token);
      
      // Verify services were initialized
      expect(AppointmentService).toHaveBeenCalledWith(client);
      expect(DepartmentService).toHaveBeenCalledWith(client);
      expect(PositionService).toHaveBeenCalledWith(client);
    });
  });

  describe('request method', () => {
    it('should delegate to httpClient.request', async () => {
      const method = 'GET';
      const endpoint = 'test-endpoint';
      const body = { key: 'value' };
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() }
      };

      httpClientMock.request.mockResolvedValue(mockResponse);

      const response = await client.request(method, endpoint, body);

      expect(httpClientMock.request).toHaveBeenCalledWith(method, endpoint, body);
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getFullDepartment method', () => {
    it('should delegate to departmentService.getFullDepartment', async () => {
      const deptCode = 'D001';
      const fullDepartment = 'Computer Science Department';
      
      // Get departmentService mock and set up return value
      const departmentServiceMock = (client as unknown).departmentService;
      departmentServiceMock.getFullDepartment.mockResolvedValue(fullDepartment);

      const result = await client.getFullDepartment(deptCode);

      expect(departmentServiceMock.getFullDepartment).toHaveBeenCalledWith(deptCode);
      expect(result).toBe(fullDepartment);
    });
  });

  describe('getFullJobTitle method', () => {
    it('should delegate to positionService.getFullJobTitle', async () => {
      const positionCode = 'P001';
      const fullJobTitle = 'Senior Software Engineer';
      
      // Get positionService mock and set up return value
      const positionServiceMock = (client as any).positionService;
      positionServiceMock.getFullJobTitle.mockResolvedValue(fullJobTitle);

      const result = await client.getFullJobTitle(positionCode);

      expect(positionServiceMock.getFullJobTitle).toHaveBeenCalledWith(positionCode);
      expect(result).toBe(fullJobTitle);
    });
  });

  describe('cleanAppointments method', () => {
    it('should delegate to appointmentService.cleanAppointments', async () => {
      const staffNumber = 'S001';
      const processedAppointments: ProcessedAppointment[] = [
        {
          appointmentId: '1',
          primaryFlag: true,
          jobTitle: 'Developer',
          fullJobTitle: 'Software Developer',
          department: 'IT',
          fullDepartment: 'Information Technology',
          startDate: '20230101',
          endDate: '20231231'
        }
      ];
      
      // Get appointmentService mock and set up return value
      const appointmentServiceMock = (client as any).appointmentService;
      appointmentServiceMock.cleanAppointments.mockResolvedValue(processedAppointments);

      const result = await client.cleanAppointments(staffNumber);

      expect(appointmentServiceMock.cleanAppointments).toHaveBeenCalledWith(staffNumber);
      expect(result).toEqual(processedAppointments);
    });
  });
});