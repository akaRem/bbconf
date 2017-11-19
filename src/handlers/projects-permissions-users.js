const { diffIgnoreableObjects } = require("../util");

class Users {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(key, obj = {}) {
    const data = await this.client.getAll(
      `rest/api/1.0/projects/${key}/permissions/users`
    );
    data.values.forEach(({ user: { name }, permission }) => {
      obj[name] = permission;
    });
    return obj;
  }

  async setProjectUsersPermission(key, name, permission) {
    await this.client.put(`rest/api/1.0/projects/${key}/permissions/users`, {
      query: { permission, name }
    });
  }

  async removeProjectUsersPermission(key, name) {
    await this.client.delete(`rest/api/1.0/projects/${key}/permissions/users`, {
      query: { name }
    });
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      const [toAdd, toChange, toRemove] = diffIgnoreableObjects(local, remote);
      for (const name of [...toAdd, ...toChange]) {
        this.setProjectUsersPermission(key, name, local[name]);
      }
      for (const name of toRemove) {
        this.removeProjectUsersPermission(key, name);
      }
    }
  }
}

module.exports = {
  Users
};
