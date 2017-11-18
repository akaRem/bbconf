const { diffIgnoreableObjects } = require("../util");
const { Repos } = require("./projects-repos");

class Permissions {
  constructor(app) {
    this.app = app;
    this.repos = new Repos(this.app);
  }

  // TODO eliminate proxies

  get remoteData() {
    return this.app.remoteData;
  }

  get client() {
    return this.app.client;
  }

  async fetch() {
    for (const key of Object.keys(this.remoteData.projects)) {
      this.remoteData.projects[key].permissions = {
        ...(this.remoteData.projects[key].permissions || {}),
        groups: {}
      };
      const data = await this.client.getAll(
        `projects/${key}/permissions/groups`
      );
      data.values.forEach(({ group: { name }, permission }) => {
        this.remoteData.projects[key].permissions.groups[name] = permission;
      });
    }
  }

  async setProjectGroupsPermission(key, group, permission) {
    await this.client.put(`projects/${key}/permissions/groups`, {
      query: {
        permission,
        name: group
      }
    });
  }

  async removeProjectGroupsPermission(key, group) {
    await this.client.delete(`projects/${key}/permissions/groups`, {
      query: {
        group
      }
    });
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      const localGroupPermissions = (local || {}).groups || {};
      const remoteGroupPermissions = (remote || {}).groups || {};

      if (localGroupPermissions !== "ignore") {
        const [toAdd, toChange, toRemove] = diffIgnoreableObjects(
          localGroupPermissions,
          remoteGroupPermissions
        );
        for (const group of [...toAdd, ...toChange]) {
          this.setProjectGroupsPermission(
            key,
            group,
            localGroupPermissions[group]
          );
        }
        for (const group of toRemove) {
          this.removeProjectGroupsPermission(key, group);
        }
      }
    }
  }
}

module.exports = {
  Permissions
};
