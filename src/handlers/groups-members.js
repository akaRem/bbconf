const { diffLists, diffIgnoreableObjects } = require("../util");

class Members {
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

  async fetch(groupName) {
    const data = await this.client.getAll("admin/groups/more-members", {
      query: { context: groupName }
    });
    this.remoteData.groups[groupName].members = data.values.map(
      ({ slug }) => slug
    );
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

  async apply(groupName, local, remote) {
    if (local !== "ignore") {
      const [usersToAdd, , usersToRemove] = diffLists(
        local || [],
        remote || []
      );

      await this.addGroupMembers(groupName, usersToAdd);
      await this.removeGroupMembers(groupName, usersToRemove);
    }
  }
}

module.exports = {
  Members
};
