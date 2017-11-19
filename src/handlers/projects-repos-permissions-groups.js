const { diffIgnoreableObjects } = require("../util");

class Groups {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(key, slug, obj = {}) {
    const data = await this.client.getAll(
      `rest/api/1.0/projects/${key}/repos/${slug}/permissions/groups`
    );
    data.values.forEach(({ group: { name }, permission }) => {
      obj[name] = permission;
    });
    return obj;
  }

  async setPermission(key, slug, name, permission) {
    await this.client.put(
      `rest/api/1.0/projects/${key}/repos/${slug}/permissions/groups`,
      {
        query: { permission, name }
      }
    );
  }

  async removePermission(key, slug, name) {
    await this.client.delete(
      `rest/api/1.0/projects/${key}/repos/${slug}/permissions/groups`,
      {
        query: { name }
      }
    );
  }

  async apply(key, slug, local = {}, remote = {}) {
    if (local !== "ignore") {
      const [toAdd, toChange, toRemove] = diffIgnoreableObjects(local, remote);
      for (const name of [...toAdd, ...toChange]) {
        this.setPermission(key, slug, name, local[name]);
      }
      for (const name of toRemove) {
        this.removePermission(key, slug, name);
      }
    }
  }
}

module.exports = {
  Groups
};
