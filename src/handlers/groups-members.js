const { diffLists } = require("../util");

class Members {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(groupName, obj = {}) {
    const data = await this.client.getAll(
      "rest/api/1.0/admin/groups/more-members",
      {
        query: { context: groupName }
      }
    );
    obj[groupName].members = data.values.map(({ slug }) => slug);
    return obj;
  }

  async addGroupMembers(groupName, members) {
    for (const userSlug of members || []) {
      await this.client.post("rest/api/1.0/admin/groups/add-user", {
        data: { context: groupName, itemName: userSlug }
      });
    }
  }

  async removeGroupMembers(groupName, members) {
    for (const userSlug of members || []) {
      await this.client.post("rest/api/1.0/admin/groups/remove-user", {
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
