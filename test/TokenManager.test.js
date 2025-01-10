import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {TokenManager} from '../src/TokenManager.js';
import {jest} from '@jest/globals';

jest.mock('fs');
jest.mock('axios');

describe('TokenManager', () => {
  const url = 'https://api.example.com/';
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';
  let tokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager(url, clientId, clientSecret);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should read cached token', () => {
    const cachedToken = { access_token: 'cached-token', expires_at: new Date().toISOString() };
    fs.readFileSync.mockReturnValue(JSON.stringify(cachedToken));

    tokenManager.readCachedToken();

    expect(tokenManager.pxdToken).toEqual(cachedToken);
  });

  test('should handle missing cached token', () => {
    fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

    tokenManager.readCachedToken();

    expect(tokenManager.pxdToken).toBeNull();
  });

  test('should cache token', () => {
    const token = { access_token: 'new-token', expires_at: new Date().toISOString() };
    tokenManager.pxdToken = token;

    tokenManager.cacheToken();

    expect(fs.writeFileSync).toHaveBeenCalledWith(('tmp/cache_token'), JSON.stringify(token));
  });

  test('should fetch token from server', async () => {
    const response = { data: { access_token: 'new-token', expires_in: 3600 } };
    axios.post.mockResolvedValue(response);

    await tokenManager.fetchToken();

    expect(tokenManager.pxdToken.access_token).toBe('new-token');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('should use cached token if valid', async () => {
    const token = { access_token: 'cached-token', expires_at: new Date(Date.now() + 3600 * 1000).toISOString() };
    tokenManager.pxdToken = token;

    const accessToken = await tokenManager.useOrFetchToken();

    expect(accessToken).toBe('cached-token');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('should fetch new token if cached token is expired', async () => {
    const expiredToken = { access_token: 'expired-token', expires_at: new Date(Date.now() - 3600 * 1000).toISOString() };
    tokenManager.pxdToken = expiredToken;
    const response = { data: { access_token: 'new-token', expires_in: 3600 } };
    axios.post.mockResolvedValue(response);

    const accessToken = await tokenManager.useOrFetchToken();

    expect(accessToken).toBe('new-token');
    expect(axios.post).toHaveBeenCalled();
  });
});