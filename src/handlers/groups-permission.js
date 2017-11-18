const { diffLists, diffIgnoreableObjects } = require("../util");

class Permission {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(obj = {}) {
    const data = await this.client.getAll("admin/permissions/groups");
    data.values.forEach(({ group: { name }, permission }) => {
      // workaround
      // group may be deleted but permissions are continue to exist
      // and it looks like ok to delete deleted group
      obj[name] = obj[name] || {};
      obj[name].permission = permission;
    });
    return obj;
  }

  async setGroupPermission(groupName, permission) {
    await this.client.put("admin/permissions/groups", {
      query: { name: groupName, permission }
    });
  }

  async deleteGroupPermission(groupName) {
    await this.client.delete("admin/permissions/groups", {
      query: { name: groupName }
    });
  }

  async apply(groupName, local, remote) {
    if (local && local !== "ignore" && local !== remote) {
      await this.setGroupPermission(groupName, local);
    }

    if (!local && remote) {
      await this.deleteGroupPermission(groupName);
    }
  }
}

module.exports = {
  Permission
};
