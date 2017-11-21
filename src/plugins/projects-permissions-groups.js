class Groups {
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
        item.groups = item.groups || {};
      }
    );

    await this.app.match(
      ["projects", ":arg", "permissions", "groups"],
      path,
      async key => {
        const data = await this.client.getAll(
          `rest/api/1.0/projects/${key}/permissions/groups`
        );
        data.values.forEach(({ group: { name }, permission }) => {
          item[name] = permission;
        });
      }
    );
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

  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "permissions", "groups", ":arg"],
      path,
      async (key, group) => {
        if (local === undefined) {
          await this.removeProjectGroupsPermission(key, group);
        } else if (remote === undefined || local !== remote) {
          await this.setProjectGroupsPermission(key, group, local);
        }
      }
    );
  }
}

module.exports = app => new Groups(app);
