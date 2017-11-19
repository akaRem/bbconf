const { diffLists } = require("../util");
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

  async fetch(user, obj = {}) {
    const data = await this.client.getAll("rest/ssh/1.0/keys", {
      query: { user }
    });

    obj[user].sshKeys = [];
    data.values.forEach(({ id, text }) => {
      obj[user].sshKeys.push(text);
      this.keyToId[text] = id;
    });
    return obj;
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

  async apply(name, local = [], remote = []) {
    if (local !== "ignore") {
      const [toAdd, , toRemove] = diffLists(local || [], remote);
      await this.addKeys(name, toAdd);
      await this.removekeys(name, toRemove);
    }
  }
}

module.exports = {
  Keys
};
