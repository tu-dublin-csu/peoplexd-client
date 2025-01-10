import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * TokenManager class to handle OAuth token management.
 */
export class TokenManager {
  /**
   * Creates an instance of TokenManager.
   * @param {string} url - The base URL for the OAuth token endpoint.
   * @param {string} clientId - The client ID for OAuth authentication.
   * @param {string} clientSecret - The client secret for OAuth authentication.
   */
  constructor(url, clientId, clientSecret) {
    this.url = url;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.pxdToken = null;
    this.readCachedToken();
  }

  /**
   * Reads the cached token from the file system.
   */
  readCachedToken() {
    try {
      const cachedToken = JSON.parse(fs.readFileSync('tmp/cache_token'), 'utf8');
      this.pxdToken = cachedToken;
    } catch (error) {
      this.pxdToken = null;
      console.log('No cached token found or error reading cache:', error.message);
    }
  }

  /**
   * Caches the token to the file system.
   */
  cacheToken() {
    try {
      const dir = 'tmp';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, 'cache_token'), JSON.stringify(this.pxdToken));
    } catch (error) {
      console.error('Error caching token:', error.message);
    }
  }

  /**
   * Calculates the token expiration date.
   * @param {number} expiresIn - The number of seconds until the token expires.
   * @returns {Date} The expiration date.
   */
  tokenExpires(expiresIn) {
    return new Date(Date.now() + (expiresIn - 60) * 1000);
  }

  /**
   * Fetches a new OAuth token from the server.
   * @throws Will throw an error if the request fails.
   */
  async fetchToken() {
    try {
      const uri = `${this.url}oauth/token`;
      const response = await axios.post(uri, null, {
        auth: {
          username: this.clientId,
          password: this.clientSecret
        },
        params: {
          grant_type: 'client_credentials'
        }
      });
      const keys = response.data;
      this.pxdToken = { access_token: keys.access_token, expires_at: this.tokenExpires(keys.expires_in) };
      this.cacheToken();
    } catch (error) {
      console.error('Error fetching token:', error.message);
      throw error;
    }
  }

  /**
   * Uses the cached token or fetches a new one if the cached token is expired or not available.
   * @returns {Promise<string>} The access token.
   */
  async useOrFetchToken() {
    if (!this.pxdToken || new Date() >= new Date(this.pxdToken.expires_at)) {
      await this.fetchToken();
    }
    return this.pxdToken.access_token;
  }
}