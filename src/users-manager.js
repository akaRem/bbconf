const { diffLists } = require("./util");

class UsersManager {
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

  async fetch() {
    this.remoteData.users = this.remoteData.users || {};

    // Get users and their details
    (await this.client.get("admin/users", {
      query: { limit: 1000 }
    })).values.forEach(({ name, emailAddress, displayName, slug }) => {
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

    // Now it's possible to find out user global permission (role)
    (await this.client.get("admin/permissions/users", {
      query: { limit: 1000 }
    })).values.forEach(
      ({ user: { slug }, permission }) =>
        (this.remoteData.users[slug].permission = permission)
    );
  }
  async apply() {
    const toIgnore = Object.keys(this.localData.users).filter(
      slug => this.localData.users[slug] === "ignore"
    );
    const [toAdd, toChange, toRemove] = diffLists(
      Object.keys(this.localData.users).filter(
        slug => !toIgnore.includes(slug)
      ),
      Object.keys(this.remoteData.users).filter(
        slug => !toIgnore.includes(slug)
      )
    );

    for (const userSlug of toAdd) {
      const localUser = this.localData.users[userSlug];
      await this.client.post("admin/users", {
        query: {
          name: userSlug,
          displayName: localUser.displayName,
          emailAddress: localUser.email,
          password: await this._decrypt(localUser.password),
          addToDefaultGroup: false,
          notify: false
        }
      });
      if (localUser.permission) {
        // create permission
        await this.client.put("admin/permissions/users", {
          query: { permission: localUser.permission, name: userSlug }
        });
      }
    }

    for (const userSlug of toRemove) {
      const remoteUser = this.remoteData.users[userSlug];
      if (remoteUser.permission) {
        // remove permissions
        await this.client.delete("admin/permissions/users", {
          query: { name: userSlug }
        });
      }
      await this.client.delete("admin/users", {
        query: { name: userSlug }
      });
    }

    for (const userSlug of toChange) {
      const localUser = this.localData.users[userSlug];
      const remoteUser = this.remoteData.users[userSlug];
      if (
        localUser.email !== remoteUser.email ||
        localUser.displayName !== remoteUser.displayName
      ) {
        // sync properties
        await this.client.put("admin/users", {
          data: {
            name: userSlug,
            displayName: localUser.displayName,
            email: localUser.email
          }
        });
      }

      if (!localUser.permission && remoteUser.permission) {
        // remove permission
        await this.client.delete("admin/permissions/users", {
          query: { name: userSlug }
        });
      }

      if (
        localUser.permission &&
        localUser.permission !== remoteUser.permission
      ) {
        // change permission
        await this.client.put("admin/permissions/users", {
          query: { permission: localUser.permission, name: userSlug }
        });
      }
    }
  }
}

module.exports = {
  UsersManager
};
