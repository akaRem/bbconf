const { Groups } = require("./projects-permissions-groups");

class Permissions {
  constructor(app) {
    this.app = app;
    this.groups = new Groups(this.app);
  }

  async fetch(obj) {
    for (const key of Object.keys(obj)) {
      obj[key].permissions = {
        ...(obj[key].permissions || {}),
        groups: {}
      };
      await this.groups.fetch(key, obj[key].permissions.groups);
    }
    return obj;
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      this.groups.apply(key, (local || {}).groups, (remote || {}).groups);
    }
  }
}

module.exports = {
  Permissions
};
