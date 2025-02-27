import fs from 'fs';
import path from 'path';
import axios from 'axios';
import timekeeper from 'timekeeper';
import MockAdapter from 'axios-mock-adapter';
import { TokenManagerService } from '../src/TokenManagerService';

const TMP_DIR = 'tmp';
const CACHE_TOKEN_FILE = 'cache_token';


jest.mock('fs');
jest.mock('path');

describe('TokenManagerService', () => {
    const url = 'https://example.com/';
    const clientId = 'test-client-id';
    const clientSecret = 'test-client-secret';
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(axios);
        timekeeper.freeze(new Date('2025-01-01'));
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
        timekeeper.reset();
    });

    it('should fetch a new token if no cached token is available', async () => {
        const tokenResponse = {
            access_token: 'new-access-token',
            expires_in: 3600
        };

        mock.onPost(`${url}oauth/token`).reply(200, tokenResponse);

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret);

        expect(tokenManager).toBeDefined();
        expect(tokenManager.useOrFetchToken()).resolves.toBe('new-access-token');
    });

    it('should use the cached token if it is not expired', async () => {
        const cachedToken = {
            access_token: 'cached-access-token',
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        };

        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(cachedToken));

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret);

        expect(tokenManager).toBeDefined();
        expect(tokenManager.useOrFetchToken()).resolves.toBe('cached-access-token');
    });

    it('should fetch a new token if the cached token is expired', async () => {
        const expiredToken = {
            access_token: 'expired-access-token',
            expires_at: new Date(Date.now() - 3600 * 1000).toISOString()
        };

        const tokenResponse = {
            access_token: 'new-access-token',
            expires_in: 3600
        };

        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(expiredToken));
        mock.onPost(`${url}oauth/token`).reply(200, tokenResponse);

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret);

        expect(tokenManager).toBeDefined();
        expect(tokenManager.useOrFetchToken()).resolves.toBe('new-access-token');
    });

    it('should cache the token after fetching a new one', async () => {
        const tokenResponse = {
            access_token: 'new-access-token',
            expires_in: 3600
        };

        mock.onPost(`${url}oauth/token`).reply(200, tokenResponse);

        const tokenManager = await TokenManagerService.new(url, clientId, clientSecret);

        expect(tokenManager).toBeDefined();
        await tokenManager.useOrFetchToken();

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.join(TMP_DIR, CACHE_TOKEN_FILE),
            JSON.stringify({
                access_token: 'new-access-token',
                expires_at: new Date(Date.now() + 3540 * 1000).toISOString()
            })
        );
    });

    it('should handle errors when fetching a new token', async () => {
        mock.onPost(`${url}oauth/token`).reply(500);

        await expect(TokenManagerService.new(url, clientId, clientSecret)).rejects.toThrow('Request failed with status code 500');
    });
});