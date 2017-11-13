const { diffLists, diffIgnoreableObjects } = require("./util");

class GroupsManager {
  constructor(app) {
    this.app = app;
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
    await Promise.all(
      groupsNames.map(async name => this.fetchGroupMembers(name))
    );
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
  async addGroupMembers(groupName, members) {
    for (const userSlug of members || []) {
      await this.client.post("admin/groups/add-user", {
        data: { context: groupName, itemName: userSlug }
      });
    }
  }
  async removeGroupMembers(groupName, members) {
    for (const userSlug of members || []) {
      await this.client.post("admin/groups/remove-user", {
        data: { context: groupName, itemName: userSlug }
      });
    }
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
      if (localGroup.members !== "ignore") {
        this.addGroupMembers(groupName, localGroup.members);
      }
    }

    for (const groupName of toRemove) {
      const remoteGroup = this.remoteData.groups[groupName];
      await this.removeGroupMembers(groupName, remoteGroup.members);
      await this.deleteGroupPermission(groupName);
      await this.deleteGroup(groupName);
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

      if (localGroup.members !== "ignore") {
        const [usersToAdd, , usersToRemove] = diffLists(
          localGroup.members || [],
          remoteGroup.members || []
        );

        await this.addGroupMembers(groupName, usersToAdd);
        await this.removeGroupMembers(groupName, usersToRemove);
      }
    }
  }
}

module.exports = {
  GroupsManager
};
