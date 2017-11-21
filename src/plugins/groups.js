class Groups {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetchGroupsNames() {
    const data = await this.client.getAll("rest/api/1.0/admin/groups");
    return data.values.map(({ name }) => ({ [name]: {} }));
  }

  async fetch(path, item) {
    await this.app.match([], path, async () => {
      const groups = await this.fetchGroupsNames();
      item.push({ groups });
    });
  }

  async createGroup(name) {
    await this.client.post("rest/api/1.0/admin/groups", { query: { name } });
  }

  async deleteGroup(name) {
    await this.client.delete("rest/api/1.0/admin/groups", { query: { name } });
  }

  async apply(path, local, remote) {
    await this.app.match(["groups", ":arg"], path, async groupName => {
      if (local === "ignore") {
        return;
      }
      if (remote === undefined) {
        await this.createGroup(groupName);
      } else if (local === undefined) {
        await this.deleteGroup(groupName);
      }
    });
  }
}

module.exports = app => new Groups(app);
