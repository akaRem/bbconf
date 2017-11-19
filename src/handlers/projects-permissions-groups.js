const { diffIgnoreableObjects } = require("../util");

class Groups {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(key, obj = {}) {
    const data = await this.client.getAll(
      `rest/api/1.0/projects/${key}/permissions/groups`
    );
    data.values.forEach(({ group: { name }, permission }) => {
      obj[name] = permission;
    });
    return obj;
  }

  async setProjectGroupsPermission(key, group, permission) {
    await this.client.put(`rest/api/1.0/projects/${key}/permissions/groups`, {
      query: {
        permission,
        name: group
      }
    });
  }

  async removeProjectGroupsPermission(key, group) {
    await this.client.delete(
      `rest/api/1.0/projects/${key}/permissions/groups`,
      {
        query: {
          group
        }
      }
    );
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      const [toAdd, toChange, toRemove] = diffIgnoreableObjects(local, remote);
      for (const group of [...toAdd, ...toChange]) {
        this.setProjectGroupsPermission(key, group, local[group]);
      }
      for (const group of toRemove) {
        this.removeProjectGroupsPermission(key, group);
      }
    }
  }
}

module.exports = {
  Groups
};
