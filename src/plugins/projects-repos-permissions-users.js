class Users {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(path, item) {
    await this.app.match(
      ["projects", ":arg", "repos", ":arg"],
      path,
      async () => {
        item.permissions = item.permissions || {};
      }
    );

    await this.app.match(
      ["projects", ":arg", "repos", ":arg", "permissions"],
      path,
      async () => {
        item.users = item.users || {};
      }
    );

    await this.app.match(
      ["projects", ":arg", "repos", ":arg", "permissions", "users"],
      path,
      async (key, slug) => {
        const data = await this.client.getAll(
          `rest/api/1.0/projects/${key}/repos/${slug}/permissions/users`
        );
        data.values.forEach(({ user: { slug }, permission }) => {
          item[slug] = permission;
        });
      }
    );
  }

  async setPermission(key, slug, name, permission) {
    await this.client.put(
      `rest/api/1.0/projects/${key}/repos/${slug}/permissions/users`,
      {
        query: { permission, name }
      }
    );
  }

  async removePermission(key, slug, name) {
    await this.client.delete(
      `rest/api/1.0/projects/${key}/repos/${slug}/permissions/users`,
      {
        query: { name }
      }
    );
  }

  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "repos", ":arg", "permissions", "users", ":arg"],
      path,
      async (key, slug, name) => {
        if (local === "ignore") {
          return;
        }
        if (local === undefined) {
          await this.removePermission(key, slug, name);
        } else if (remote === undefined || local !== remote) {
          await this.setPermission(key, slug, name, local);
        }
      }
    );
  }
}

module.exports = app => new Users(app);
