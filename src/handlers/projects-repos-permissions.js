const { Groups } = require("./projects-repos-permissions-groups");
const { Users } = require("./projects-repos-permissions-users");

class Permissions {
  constructor(app) {
    this.app = app;
    this.groups = new Groups(this.app);
    this.users = new Users(this.app);
  }

  async fetch(key, slug, obj) {
    obj.permissions = {
      ...(obj.permissions || {}),
      groups: {},
      users: {}
    };
    await this.groups.fetch(key, slug, obj.permissions.groups);
    await this.users.fetch(key, slug, obj.permissions.users);
    return obj;
  }

  async apply(key, slug, local = {}, remote = {}) {
    if (local !== "ignore") {
      this.groups.apply(key, slug, (local || {}).groups, (remote || {}).groups);
      this.users.apply(key, slug, (local || {}).users, (remote || {}).users);
    }
  }
}

module.exports = {
  Permissions
};
