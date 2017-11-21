class Users {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  get _decrypt() {
    return this.app._decrypt;
  }

  async fetchUsers() {
    const data = await this.client.getAll("rest/api/1.0/admin/users");
    const users = data.values
      .sort((u1, u2) => u1.name > u2.name)
      .map(({ name, emailAddress, displayName, slug }) => {
        if (slug !== name) {
          // FIXME console.warn
          // eslint-disable-next-line no-console
          console.warn(
            `UserSlug should match UserName, "${slug}" !== "${name}"`
          );
        }
        return {
          [slug]: {
            displayName,
            email: emailAddress
          }
        };
      });
    return users;
  }

  async fetch(path, item) {
    await this.app.match([], path, async () => {
      const users = await this.fetchUsers();
      item.push({ users });
    });
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

  async apply(path, local, remote) {
    await this.app.match(["users", ":arg"], path, async name => {
      if (local === "ignore") {
        return;
      }
      if (remote === undefined) {
        const { email, password, displayName } = local;
        await this.createUser({
          name,
          emailAddress: email,
          displayName,
          password: await this._decrypt(password)
        });
      } else if (local === undefined) {
        await this.removeUser(name);
      } else {
        const { displayName, email } = local;
        if (email !== remote.email || displayName !== remote.displayName) {
          await this.updateUser(name, {
            displayName,
            email
          });
        }
      }
    });
  }
}

module.exports = app => new Users(app);
