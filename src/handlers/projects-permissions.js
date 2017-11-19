const { Groups } = require("./projects-permissions-groups");
const { Users } = require("./projects-permissions-users");

class Permissions {
  constructor(app) {
    this.app = app;
    this.groups = new Groups(this.app);
    this.users = new Users(this.app);
  }

  async fetch(obj) {
    for (const key of Object.keys(obj)) {
      obj[key].permissions = {
        ...(obj[key].permissions || {}),
        groups: {},
        users: {}
      };
      await this.groups.fetch(key, obj[key].permissions.groups);
      await this.users.fetch(key, obj[key].permissions.users);
    }
    return obj;
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      this.groups.apply(key, (local || {}).groups, (remote || {}).groups);
      this.users.apply(key, (local || {}).users, (remote || {}).users);
    }
  }
}

module.exports = {
  Permissions
};
