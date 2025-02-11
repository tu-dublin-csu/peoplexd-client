import axios from 'axios'
import { PeopleXdClient } from '../src/peoplexd-client'
import { TokenManager } from '../src/token-manager'

jest.mock('axios')
jest.mock('../src/token-manager')

describe('PeopleXdClient', () => {
    const url = 'https://api.example.com/'
    const clientId = 'test-client-id'
    const clientSecret = 'test-client-secret'

    let client: PeopleXdClient

    beforeEach(() => {

    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.restoreAllMocks()
    })

    it('should be instantiated correctly', async () => {
        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        expect(client).toBeInstanceOf(PeopleXdClient) 
        expect(TokenManager.createInstance).toHaveBeenCalledTimes(1) // Ensure TokenManager was called once
        expect(TokenManager.createInstance).toHaveBeenCalledWith(url, clientId, clientSecret)
    })

    it('should fetch appointments data correctly', async () => {
        
        const mockData = [{ id: 11, name: 'Meet John Doe' }]

        const token = 'access_token'
        const mockTokenManagerInstance = {
            useOrFetchToken: jest.fn().mockResolvedValue(token)
        }
        TokenManager.createInstance = jest.fn().mockResolvedValue(mockTokenManagerInstance)
        PeopleXdClient.tokenManager = await TokenManager.createInstance(url, clientId, clientSecret)
        jest.spyOn(PeopleXdClient.tokenManager, 'useOrFetchToken').mockResolvedValue(token)
        ;(axios as unknown as jest.Mock).mockResolvedValue({ data: mockData })

        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        const data = await client.appointments('11')

        expect(data).toEqual({ data: mockData })
        expect(axios).toHaveBeenCalledTimes(1)
        expect(PeopleXdClient.tokenManager.useOrFetchToken).toHaveBeenCalledTimes(1)
    })

    it('should fetch department data correctly', async () => {
        
        const mockData = [{ id: 'RE02', name: 'Computer Science' }]
        const token = 'access_token'
        const mockTokenManagerInstance = {
            useOrFetchToken: jest.fn().mockResolvedValue(token)
        }
        TokenManager.createInstance = jest.fn().mockResolvedValue(mockTokenManagerInstance)
        PeopleXdClient.tokenManager = await TokenManager.createInstance(url, clientId, clientSecret)
        jest.spyOn(PeopleXdClient.tokenManager, 'useOrFetchToken').mockResolvedValue(token)
        ;(axios as unknown as jest.Mock).mockResolvedValue({ data: mockData })

        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        const data = await client.department('RE02')

        expect(data).toEqual({ data: mockData })
        expect(axios).toHaveBeenCalledTimes(1)
        expect(PeopleXdClient.tokenManager.useOrFetchToken).toHaveBeenCalledTimes(1)
    })

    it('should fetch position title data correctly', async () => {
        
        const mockData = { items: [{ type: 'POSTTL', code: 'CSUL', description: 'Common Services Unit Lead' }] }

        const token = 'access_token'
        const mockTokenManagerInstance = {
            useOrFetchToken: jest.fn().mockResolvedValue(token)
        }
        TokenManager.createInstance = jest.fn().mockResolvedValue(mockTokenManagerInstance)
        PeopleXdClient.tokenManager = await TokenManager.createInstance(url, clientId, clientSecret)
        jest.spyOn(PeopleXdClient.tokenManager, 'useOrFetchToken').mockResolvedValue(token)
        ;(axios as unknown as jest.Mock).mockResolvedValue({ data: mockData })

        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        const data = await client.positionTitle('CSUL')

        expect(data).toEqual({ data: mockData })
        expect(axios).toHaveBeenCalledTimes(1)
        expect(PeopleXdClient.tokenManager.useOrFetchToken).toHaveBeenCalledTimes(1)

    })

    it('should handle fetch appointments where an error occurs', async () => {
        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        const token = 'access_token'
        const mockTokenManagerInstance = {
            useOrFetchToken: jest.fn().mockResolvedValue(token)
        }
        TokenManager.createInstance = jest.fn().mockResolvedValue(mockTokenManagerInstance)
        PeopleXdClient.tokenManager = await TokenManager.createInstance(url, clientId, clientSecret)
        jest.spyOn(PeopleXdClient.tokenManager, 'useOrFetchToken').mockResolvedValue(token)
        ;(axios as unknown as jest.Mock).mockRejectedValue(new Error('Network Error'))

        await expect(client.appointments('11')).rejects.toThrow('Network Error')
    })

    it('should handle fetch department where an error occurs', async () => {
        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        const token = 'access_token'
        const mockTokenManagerInstance = {
            useOrFetchToken: jest.fn().mockResolvedValue(token)
        }
        TokenManager.createInstance = jest.fn().mockResolvedValue(mockTokenManagerInstance)
        PeopleXdClient.tokenManager = await TokenManager.createInstance(url, clientId, clientSecret)
        jest.spyOn(PeopleXdClient.tokenManager, 'useOrFetchToken').mockResolvedValue(token)
        ;(axios as unknown as jest.Mock).mockRejectedValue(new Error('Network Error!'))

        await expect(client.department('ROOM_11')).rejects.toThrow('Network Error!')
    })

    it('should handle fetch position title where an error occurs', async () => {
        client = await PeopleXdClient.createInstance(url, clientId, clientSecret)
        const token = 'access_token'
        const mockTokenManagerInstance = {
            useOrFetchToken: jest.fn().mockResolvedValue(token)
        }
        TokenManager.createInstance = jest.fn().mockResolvedValue(mockTokenManagerInstance)
        PeopleXdClient.tokenManager = await TokenManager.createInstance(url, clientId, clientSecret)
        jest.spyOn(PeopleXdClient.tokenManager, 'useOrFetchToken').mockResolvedValue(token)
        ;(axios as unknown as jest.Mock).mockRejectedValue(new Error('Network Error!'))

        await expect(client.positionTitle('CSUS')).rejects.toThrow('Network Error!')
    })
})
