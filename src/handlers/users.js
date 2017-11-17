const { diffIgnoreableObjects } = require("../util");

class Users {
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

  get _decrypt() {
    return this.app._decrypt;
  }

  async fetchUsers() {
    const data = await this.client.getAll("admin/users");
    data.values.forEach(({ name, emailAddress, displayName, slug }) => {
      if (slug !== name) {
        // FIXME console.warn
        // eslint-disable-next-line no-console
        console.warn(`UserSlug should match UserName, "${slug}" !== "${name}"`);
      }
      this.remoteData.users[slug] = {
        displayName,
        email: emailAddress
      };
    });
  }

  async fetchUsersPermissions() {
    const data = await this.client.getAll("admin/permissions/users");
    data.values.forEach(
      ({ user: { slug }, permission }) =>
        (this.remoteData.users[slug].permission = permission)
    );
  }

  async fetch() {
    this.remoteData.users = this.remoteData.users || {};
    await this.fetchUsers();
    await this.fetchUsersPermissions();
  }

  async createUser(data) {
    await this.client.post("admin/users", {
      query: {
        addToDefaultGroup: false,
        notify: false,
        ...data
      }
    });
  }

  async updateUser(name, data) {
    await this.client.put("admin/users", {
      data: {
        name,
        ...data
      }
    });
  }

  async removeUser(name) {
    await this.client.delete("admin/users", {
      query: { name }
    });
  }

  async setUserPermission(name, permission) {
    await this.client.put("admin/permissions/users", {
      query: { name, permission }
    });
  }

  async removeUserPermission(name) {
    await this.client.delete("admin/permissions/users", { query: { name } });
  }

  async apply() {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(
      this.localData.users,
      this.remoteData.users
    );

    for (const name of toAdd) {
      const { email, password, displayName, permission } = this.localData.users[
        name
      ];
      await this.createUser({
        name,
        emailAddress: email,
        displayName,
        password: await this._decrypt(password)
      });
      if (permission) {
        await this.setUserPermission(name, permission);
      }
    }

    for (const name of toRemove) {
      const { permission } = this.remoteData.users[name];
      if (permission) {
        await this.removeUserPermission(name);
      }
      await this.removeUser(name);
    }

    for (const name of toChange) {
      const { displayName, email, permission } = this.localData.users[name];
      const remoteUser = this.remoteData.users[name];
      if (
        email !== remoteUser.email ||
        displayName !== remoteUser.displayName
      ) {
        await this.updateUser(name, {
          displayName,
          email
        });
      }

      if (!permission && remoteUser.permission) {
        await this.removeUserPermission(name);
      }

      if (permission && permission !== remoteUser.permission) {
        await this.setUserPermission(name, permission);
      }
    }
  }
}

module.exports = {
  Users
};
