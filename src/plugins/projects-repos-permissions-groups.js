class Groups {
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
        item.groups = item.groups || {};
      }
    );

    await this.app.match(
      ["projects", ":arg", "repos", ":arg", "permissions", "groups"],
      path,
      async (key, slug) => {
        const data = await this.client.getAll(
          `rest/api/1.0/projects/${key}/repos/${slug}/permissions/groups`
        );
        data.values.forEach(({ group: { name }, permission }) => {
          item[name] = permission;
        });
      }
    );
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

  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "repos", ":arg", "permissions", "groups", ":arg"],
      path,
      async (key, slug, name) => {
        if (local === undefined) {
          await this.removePermission(key, slug, name);
        } else if (remote === undefined || local !== remote) {
          await this.setPermission(key, slug, name, local);
        }
      }
    );
  }
}

module.exports = app => new Groups(app);
