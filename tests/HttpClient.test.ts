import axios from 'axios';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { HttpClient } from '../src/HttpClient';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('HttpClient', () => {
  const baseUrl = 'https://api.example.com/';
  const token = 'test-auth-token';
  let httpClient: HttpClient;

  beforeEach(() => {
    jest.clearAllMocks();
    httpClient = new HttpClient(baseUrl, token);
  });

  it('should make a GET request with correct parameters', async () => {
    const endpoint = 'users';
    const mockResponse: AxiosResponse = {
      data: { id: 1, name: 'John Doe' },
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() }
    };

    // Mock axios response
    mockedAxios.mockResolvedValueOnce(mockResponse);

    // Make the request
    const response = await httpClient.request('GET', endpoint);

    // Check that axios was called with correct parameters
    expect(axios).toHaveBeenCalledWith({
      method: 'GET',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: null
    });

    // Check that the response was returned correctly
    expect(response).toEqual(mockResponse);
  });

  it('should make a POST request with body data', async () => {
    const endpoint = 'users';
    const bodyData = { name: 'John Doe', email: 'john@example.com' };
    const mockResponse: AxiosResponse = {
      data: { id: 1, ...bodyData },
      status: 201,
      statusText: 'Created',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() }
    };

    // Mock axios response
    mockedAxios.mockResolvedValueOnce(mockResponse);

    // Make the request
    const response = await httpClient.request('POST', endpoint, bodyData);

    // Check that axios was called with correct parameters
    expect(axios).toHaveBeenCalledWith({
      method: 'POST',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: bodyData
    });

    // Check that the response was returned correctly
    expect(response).toEqual(mockResponse);
  });

  it('should handle errors when the request fails', async () => {
    const endpoint = 'invalid';
    const errorMessage = 'Network Error';
    const mockError = new Error(errorMessage);

    // Mock axios to throw an error
    mockedAxios.mockRejectedValueOnce(mockError);

    // Expect request to throw error
    await expect(httpClient.request('GET', endpoint)).rejects.toThrow(errorMessage);

    // Check that axios was called with correct parameters
    expect(axios).toHaveBeenCalledWith({
      method: 'GET',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: null
    });
  });
});