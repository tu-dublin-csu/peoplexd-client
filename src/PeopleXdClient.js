import axios from 'axios';
import TokenManager from './TokenManager.js';

/**
 * PeopleXdClient class to interact with the PeopleXD API.
 */
export class PeopleXdClient {

  /**
   * Creates an instance of PeopleXdClient.
   * @param {string} url - The base URL of the PeopleXD API.
   * @param {string} clientId - The client ID for OAuth authentication.
   * @param {string} clientSecret - The client secret for OAuth authentication.
   * @param {boolean} [useCache=true] - Whether to use cached tokens.
   */
  constructor(url, clientId, clientSecret, useCache = true) {
    this.useCache = useCache;
    this.url = url;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenManager = new TokenManager(url, clientId, clientSecret);
  }

  /**
   * Fetches the appointments for a given staff number.
   * @param {string} staffNumber - The staff number to fetch appointments for.
   * @returns {Promise<Object>} The appointments data.
   * @throws Will throw an error if the request fails.
   */
  async appointments(staffNumber) {
    try {
      const response = await this.#request('get', `v1/person/appointment/${staffNumber}`);
      return response.data;
    } catch (e) {
      console.error(`Error fetching appointments for ${staffNumber}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Fetches the department information for a given department code.
   * @param {string} deptCode - The department code to fetch information for.
   * @returns {Promise<Object>} The department data.
   * @throws Will throw an error if the request fails.
   */
  async department(deptCode) {
    try {
      const response = await this.#request('get', `v1/reference/type/DEPT/${deptCode}`);
      return response.data;
    } catch (e) {
      console.error(`Error fetching department for ${deptCode}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Makes an HTTP request to the PeopleXD API.
   * @param {string} method - The HTTP method (get, post, put).
   * @param {string} endpoint - The API endpoint.
   * @param {Object} [body=null] - The request body for POST and PUT requests.
   * @returns {Promise<Object>} The response data.
   * @throws Will throw an error if the request fails.
   */
  async #request(method, endpoint, body = null) {
    const uri = `${this.url}${endpoint}`;
    const token = await this.tokenManager.useOrFetchToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      const response = await axios({
        method,
        url: uri,
        headers,
        data: body
      });
      console.debug(`${method.toUpperCase()} ${uri} response: ${JSON.stringify(response.data, null, 2)}`);
      return response;
    } catch (error) {
      console.error(`Error during ${method.toUpperCase()} request to ${uri}: ${error.message}`);
      throw error;
    }
  }

  async get(path) {
    return this.#request('get', path);
  }

  async post(path, body) {
    return this.#request('post', path, body);
  }

  async put(path, body) {
    return this.#request('put', path, body);
  }
}