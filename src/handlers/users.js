const { diffIgnoreableObjects } = require("../util");
const { Permission } = require("./users-permission");
const { Keys } = require("./users-keys");
class Users {
  constructor(app) {
    this.app = app;
    this.permission = new Permission(this.app);
    this.keys = new Keys(this.app);
  }

  get client() {
    return this.app.client;
  }

  get _decrypt() {
    return this.app._decrypt;
  }

  async fetchUsers(users = {}) {
    const data = await this.client.getAll("rest/api/1.0/admin/users");
    data.values.forEach(({ name, emailAddress, displayName, slug }) => {
      if (slug !== name) {
        // FIXME console.warn
        // eslint-disable-next-line no-console
        console.warn(`UserSlug should match UserName, "${slug}" !== "${name}"`);
      }
      users[slug] = {
        displayName,
        email: emailAddress
      };
    });
    return users;
  }

  async fetch(users = {}) {
    users = await this.fetchUsers(users);
    users = await this.permission.fetch(users);
    for (const userName of Object.keys(users)) {
      this.keys.fetch(userName, users);
    }

    return users;
  }

  async createUser(data) {
    await this.client.post("rest/api/1.0/admin/users", {
      query: {
        addToDefaultGroup: false,
        notify: false,
        ...data
      }
    });
  }

  async updateUser(name, data) {
    await this.client.put("rest/api/1.0/admin/users", {
      data: {
        name,
        ...data
      }
    });
  }

  async removeUser(name) {
    await this.client.delete("rest/api/1.0/admin/users", {
      query: { name }
    });
  }

  async apply(local, remote) {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(local, remote);

    for (const name of toAdd) {
      const { email, password, displayName } = local[name];
      await this.createUser({
        name,
        emailAddress: email,
        displayName,
        password: await this._decrypt(password)
      });
    }

    for (const name of toChange) {
      const { displayName, email } = local[name];
      const remoteUser = remote[name];
      if (
        email !== remoteUser.email ||
        displayName !== remoteUser.displayName
      ) {
        await this.updateUser(name, {
          displayName,
          email
        });
      }
    }

    for (const name of [...toAdd, ...toChange, ...toRemove]) {
      await this.permission.apply(
        name,
        (local[name] || {}).permission,
        (remote[name] || {}).permission
      );
      await this.keys.apply(
        name,
        (local[name] || {}).sshKeys,
        (remote[name] || {}).sshKeys
      );
    }

    for (const name of toRemove) {
      await this.removeUser(name);
    }
  }
}

module.exports = {
  Users
};
