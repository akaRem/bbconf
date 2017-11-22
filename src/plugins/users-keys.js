class Keys {
  constructor(app) {
    this.app = app;
    // FIXME keep this index in remote data
    // FIXME add export functionality for remote data
    this.keyToId = {};
  }

  get client() {
    return this.app.client;
  }

  async fetch(path, item) {
    await this.app.match(["users", ":arg"], path, async user => {
      const data = await this.client.getAll("rest/ssh/1.0/keys", {
        query: { user }
      });
      item.sshKeys = [];
      data.values.forEach(({ id, text }) => {
        item.sshKeys.push(text);
        this.keyToId[text] = id;
      });
    });
  }

  async addKeys(name, keys) {
    for (const keyContent of keys) {
      await this.client.post("rest/ssh/1.0/keys", {
        query: { user: name },
        data: { text: keyContent }
      });
    }
  }
  async removekeys(name, keys) {
    for (const keyContent of keys) {
      const keyId = this.keyToId[keyContent];
      await this.client.delete(`rest/ssh/1.0/keys/${keyId}`);
    }
  }

  async apply(path, local, remote) {
    await this.app.match(["users", ":arg", "sshKeys"], path, async name => {
      const [toAdd, , toRemove] = this.app.diffLists(local, remote);
      await this.addKeys(name, toAdd);
      await this.removekeys(name, toRemove);
    });
  }
}

module.exports = app => new Keys(app);
