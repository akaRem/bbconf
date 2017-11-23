const fetch = require("isomorphic-fetch");
const urljoin = require("url-join");
const querystring = require("querystring");

class Client {
  constructor(app, options) {
    this.app = app;
    this.logger = app.logger.getLogger("client");
    this.options = options;
  }

  async req(apiEndpoint, { method, data, query }) {
    // TODO hold these things in client itself
    const baseUrl = this.options.baseUrl;
    const password = this.options.password;
    const user = this.options.user;

    const url = urljoin(
      baseUrl,
      apiEndpoint,
      query ? "?" + querystring.stringify(query) : ""
    );

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${new Buffer(`${user}:${password}`).toString(
          "base64"
        )}`
      },
      method,
      body: data ? JSON.stringify(data) : ""
    });

    let respData;
    try {
      respData = await response.json();
    } catch (e) {
      // workaround for broken api endpoints such as "admin/groups/add-user",
      // "admin/groups/remove-user" and also generic "skip" for 204 and similar
      respData = null;
    }

    const details = {
      request: {
        method,
        url,
        data
      },
      response: {
        status: response.status,
        data: respData
      }
    };
    if (response.status === 200) {
      this.logger.info(`HTTP - ${method} - ${url}`, details);
    }
    if (response.status !== 200) {
      this.logger.error(
        `HTTP - ${method} - ${url} - status ${response.status} !== 200`,
        details
      );
    }
    if (respData === null) {
      this.logger.error(
        `HTTP - ${method} - ${url} - response is empty`,
        details
      );
    }
    // console.log(details);
    return respData;
  }

  async get(apiEndpoint, { data, query } = {}) {
    return await this.req(apiEndpoint, { method: "GET", data, query });
  }
  async getAll(apiEndpoint, { query } = {}) {
    return await this.get(apiEndpoint, {
      query: { limit: 1000, ...(query || {}) }
    });
  }
  async post(apiEndpoint, { data, query }) {
    return await this.req(apiEndpoint, { method: "POST", data, query });
  }
  async put(apiEndpoint, { data, query }) {
    return await this.req(apiEndpoint, { method: "PUT", data, query });
  }
  async delete(apiEndpoint, { data, query } = {}) {
    return await this.req(apiEndpoint, { method: "DELETE", data, query });
  }
}

module.exports = {
  Client
};
