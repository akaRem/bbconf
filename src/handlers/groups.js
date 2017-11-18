const { diffLists, diffIgnoreableObjects } = require("../util");
const { Members } = require("./groups-members");

class Groups {
  constructor(app) {
    this.app = app;
    this.members = new Members(this.app);
  }

  // TODO eliminate proxies
  get localData() {
    return this.app.localData;
  }

  get remoteData() {
    return this.app.remoteData;
  }

  get client() {
    return this.app.client;
  }

  async fetchGroupsNames() {
    const data = await this.client.getAll("admin/groups");
    data.values.forEach(({ name /* deletable */ }) => {
      this.remoteData.groups[name] = {};
    });
  }

  async fetchGroupsPermissions() {
    const data = await this.client.getAll("admin/permissions/groups");
    data.values.forEach(({ group: { name }, permission }) => {
      // workaround
      // group may be deleted but permissions are continue to exist
      // and it looks like ok to delete deleted group
      this.remoteData.groups[name] = this.remoteData.groups[name] || {};
      this.remoteData.groups[name].permission = permission;
    });
  }

  async fetchGroupMembers(groupName) {
    const data = await this.client.getAll("admin/groups/more-members", {
      query: { context: groupName }
    });
    this.remoteData.groups[groupName].members = data.values.map(
      ({ slug }) => slug
    );
  }

  async fetch() {
    this.remoteData.groups = this.remoteData.groups || {};
    await this.fetchGroupsNames();
    await this.fetchGroupsPermissions();

    const groupsNames = Object.keys(this.remoteData.groups);
    await Promise.all(groupsNames.map(async name => this.members.fetch(name)));
  }

  async createGroup(groupName) {
    await this.client.post("admin/groups", {
      query: { name: groupName }
    });
  }
  async deleteGroup(groupName) {
    await this.client.delete("admin/groups", {
      query: { name: groupName }
    });
  }

  async setGroupPermission(groupName, permission) {
    await this.client.put("admin/permissions/groups", {
      query: { name: groupName, permission }
    });
  }

  async deleteGroupPermission(groupName) {
    await this.client.delete("admin/permissions/groups", {
      query: { name: groupName }
    });
  }

  async apply() {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(
      this.localData.groups,
      this.remoteData.groups
    );

    for (const groupName of toAdd) {
      const localGroup = this.localData.groups[groupName];
      await this.createGroup(groupName);
      if (localGroup.permission) {
        await this.setGroupPermission(groupName, localGroup.permission);
      }
      await this.members.apply(groupName, localGroup.members, []);
    }

    for (const groupName of toChange) {
      const localGroup = this.localData.groups[groupName];
      const remoteGroup = this.remoteData.groups[groupName];

      if (
        localGroup.permission &&
        localGroup.permission !== "ignore" &&
        localGroup.permission !== remoteGroup.permission
      ) {
        await this.setGroupPermission(groupName, localGroup.permission);
      }

      if (!localGroup.permission && remoteGroup.permission) {
        await this.deleteGroupPermission(groupName);
      }

      await this.members.apply(
        groupName,
        localGroup.members,
        remoteGroup.members
      );
    }

    for (const groupName of toRemove) {
      const remoteGroup = this.remoteData.groups[groupName];
      await this.members.apply(groupName, [], remoteGroup.members);
      await this.deleteGroupPermission(groupName);
      await this.deleteGroup(groupName);
    }
  }
}

module.exports = {
  Groups
};
