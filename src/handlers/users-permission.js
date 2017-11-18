class Permission {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(obj = {}) {
    const data = await this.client.getAll("admin/permissions/users");
    data.values.forEach(
      ({ user: { slug }, permission }) => (obj[slug].permission = permission)
    );
    return obj;
  }

  async setUserPermission(name, permission) {
    await this.client.put("admin/permissions/users", {
      query: { name, permission }
    });
  }

  async removeUserPermission(name) {
    await this.client.delete("admin/permissions/users", { query: { name } });
  }

  async apply(name, local, remote) {
    if (local && local !== "ignore" && local !== remote) {
      await this.setUserPermission(name, local);
    }

    if (!local && remote) {
      await this.removeUserPermission(name);
    }
  }
}

module.exports = {
  Permission
};
