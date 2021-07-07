import fetch from 'node-fetch';
/*
 * This class assists in exchanging data with GeoNetwork 
 */
export default class GeoNetworkClient {

  /**
   * 
   * @param {String} url The URL to the default GeoNetwork endpoint, e.g. http://localhost:1234/geonetwork/srv/
   * @param {String} user The username
   * @param {String} password The password
   */
  constructor (url, user, password) {
    this.url = url.endsWith('/') ? url : url + '/';
    this.user = user;
    this.password = password;
    this.auth = Buffer.from(this.user + ':' + this.password).toString('base64');
  }

  /**
   * Tries to login to GeoNetwork with the given credentials
   * @returns boolean to indicate if login was successful
   */
  async login() {
    const tokenResponse = await fetch(this.url + 'eng/info', {
      method: 'POST'
    });
    this.cookie = tokenResponse.headers.get('set-cookie');
    this.xsrf = this.cookie.split('XSRF-TOKEN=')[1].split(';')[0];

    const loginResponse = await fetch(this.url + 'eng/info', {
      credentials: 'include',
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + this.auth,
        'X-XSRF-TOKEN': this.xsrf,
        Cookie: this.cookie
      }
    });

    if (loginResponse.status === 200) {
      return true;
    }
    return false;
  }

  /**
   * Checks if we can connect to GeoNetwork
   * @returns boolean flag to indicate if the connection could be established
   */
  async exists() {
    return await this.login();
  }

  /**
   * Publishes or updates the given Metadata XML
   * @param {String} metadata The stringified metadata 
   * @param {String} mode Optional mode indicating `CREATE` or `UPDATE` mode 
   * @returns the uuid in case of success, false otherwise
   */
  async publish(metadata, mode) {
    const loggedIn = await this.login();
    if (loggedIn) {
      const publishResponse = await fetch(this.url + 'api/records?' + new URLSearchParams({
        metadataType: 'METADATA',
        uuidProcessing: mode === 'CREATE' ? 'GENERATEUUID' : mode === 'UPDATE' ? 'OVERWRITE' : '',
        publishToAll: 'on'
      }), {
        credentials: 'include',
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: 'Basic ' + this.auth,
          'X-XSRF-TOKEN': this.xsrf,
          Cookie: this.cookie,
          'Content-type': 'application/xml'
        },
        body: metadata
      });
      const result = await publishResponse.json();
      if (publishResponse.status === 201) {
        return await result.uuid;
      }
      return false;
    }
    return false;
  }
}
