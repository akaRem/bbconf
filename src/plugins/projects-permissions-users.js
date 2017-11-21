class Users {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(path, item) {
    await this.app.match(["projects", ":arg"], path, async () => {
      item.permissions = item.permissions || {};
    });

    await this.app.match(
      ["projects", ":arg", "permissions"],
      path,
      async () => {
        item.users = item.users || {};
      }
    );

    await this.app.match(
      ["projects", ":arg", "permissions", "users"],
      path,
      async key => {
        const data = await this.client.getAll(
          `rest/api/1.0/projects/${key}/permissions/users`
        );
        data.values.forEach(({ user: { name }, permission }) => {
          item[name] = permission;
        });
      }
    );
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

  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "permissions", "users", ":arg"],
      path,
      async (key, group) => {
        if (local === undefined) {
          await this.removeProjectUsersPermission(key, group);
        } else if (remote === undefined || local !== remote) {
          await this.setProjectUsersPermission(key, group, local);
        }
      }
    );
  }
}

module.exports = app => new Users(app);
