class Permission {
  constructor(app) {
    this.app = app;
    this._cache = {};
  }

  get client() {
    return this.app.client;
  }

  async fetchPermissions() {
    const permissionMapping = {};
    const data = await this.client.getAll(
      "rest/api/1.0/admin/permissions/users"
    );
    data.values.forEach(
      ({ user: { slug }, permission }) => (permissionMapping[slug] = permission)
    );
    return permissionMapping;
  }

  async fetch(path, item) {
    await this.app.match(["users"], path, async () => {
      this._cache = await this.fetchPermissions();
    });
    await this.app.match(["users", ":arg"], path, async name => {
      if (this._cache[name] !== undefined) {
        item.permission = this._cache[name];
      }
    });
  }

  async setUserPermission(name, permission) {
    await this.client.put("rest/api/1.0/admin/permissions/users", {
      query: { name, permission }
    });
  }

  async removeUserPermission(name) {
    await this.client.delete("rest/api/1.0/admin/permissions/users", {
      query: { name }
    });
  }

  async apply(path, local, remote) {
    await this.app.match(["users", ":arg", "permission"], path, async name => {
      if (local === "ignore") {
        return;
      }
      if (local === undefined) {
        await this.removeUserPermission(name);
      } else if (remote === undefined || local !== remote) {
        await this.setUserPermission(name, local);
      }
    });
  }
}
module.exports = app => new Permission(app);
