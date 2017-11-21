const { diffLists } = require("../util");

class Members {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetchMembers(groupName) {
    const data = await this.client.getAll(
      "rest/api/1.0/admin/groups/more-members",
      {
        query: { context: groupName }
      }
    );
    return data.values.map(({ slug }) => slug);
  }

  async fetch(path, item) {
    await this.app.match(["groups", ":arg"], path, async groupName => {
      item.members = await this.fetchMembers(groupName);
    });
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

  async apply(path, local, remote) {
    await this.app.match(
      ["groups", ":arg", "members"],
      path,
      async groupName => {
        const [usersToAdd, , usersToRemove] = diffLists(
          local || [],
          remote || []
        );

        await this.addGroupMembers(groupName, usersToAdd);
        await this.removeGroupMembers(groupName, usersToRemove);
      }
    );
  }
}

module.exports = app => new Members(app);
