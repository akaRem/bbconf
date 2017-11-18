const { diffIgnoreableObjects } = require("../util");
const { Members } = require("./groups-members");
const { Permission } = require("./groups-permission");

class Groups {
  constructor(app) {
    this.app = app;
    this.members = new Members(this.app);
    this.permission = new Permission(this.app);
  }

  get client() {
    return this.app.client;
  }

  async fetchGroupsNames(obj = {}) {
    const data = await this.client.getAll("admin/groups");
    data.values.forEach(({ name }) => (obj[name] = {}));
    return obj;
  }

  async fetch(groups = {}) {
    groups = await this.fetchGroupsNames(groups);
    groups = await this.permission.fetch(groups);
    for (const groupName of Object.keys(groups)) {
      groups = await this.members.fetch(groupName, groups);
    }
    return groups;
  }

  async createGroup(name) {
    await this.client.post("admin/groups", { query: { name } });
  }

  async deleteGroup(name) {
    await this.client.delete("admin/groups", { query: { name } });
  }

  async apply(local, remote) {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(local, remote);

    for (const groupName of toAdd) {
      await this.createGroup(groupName);
    }

    for (const groupName of [...toAdd, ...toChange, ...toRemove]) {
      const localGroup = local[groupName];
      const remoteGroup = remote[groupName];

      await this.permission.apply(
        groupName,
        (localGroup || {}).permission,
        (remoteGroup || {}).permission
      );

      await this.members.apply(
        groupName,
        (localGroup || {}).members,
        (remoteGroup || {}).members
      );
    }

    for (const groupName of toRemove) {
      await this.deleteGroup(groupName);
    }
  }
}

module.exports = {
  Groups
};
