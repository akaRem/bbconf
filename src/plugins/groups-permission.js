class Permission {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetchPermissions() {
    const permissionMapping = {};
    const data = await this.client.getAll(
      "rest/api/1.0/admin/permissions/groups"
    );

    data.values.forEach(
      ({ group: { name }, permission }) =>
        (permissionMapping[name] = permission)
    );
    return permissionMapping;
  }

  async fetch(path, item) {
    await this.app.match(["groups"], path, async () => {
      this._cache = await this.fetchPermissions();
    });
    await this.app.match(["groups", ":arg"], path, async name => {
      if (this._cache[name] !== undefined) {
        item.permission = this._cache[name];
      }
    });
  }

  async setPermission(groupName, permission) {
    await this.client.put("rest/api/1.0/admin/permissions/groups", {
      query: { name: groupName, permission }
    });
  }

  async removePermission(groupName) {
    await this.client.delete("rest/api/1.0/admin/permissions/groups", {
      query: { name: groupName }
    });
  }

  async apply(path, local, remote) {
    await this.app.match(["groups", ":arg", "permission"], path, async name => {
      if (local === "ignore") {
        return;
      }
      if (local === undefined) {
        await this.removePermission(name);
      } else if (remote === undefined || local !== remote) {
        await this.setPermission(name, local);
      }
    });
  }
}

module.exports = app => new Permission(app);
