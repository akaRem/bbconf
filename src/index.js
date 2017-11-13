const { Client } = require("./client");

const diffLists = (a, b) => {
  const onlyInA = a.filter(i => !b.includes(i));
  const onlyInB = b.filter(i => !a.includes(i));
  const both = a.filter(i => b.includes(i));
  return [onlyInA, both, onlyInB];
};

class Application {
  constructor(options) {
    this.connectionOptions = options.connection;
    this.localData = options.config;
    this.remoteData = null;
    this.client = new Client(this);
  }

  async _decrypt(password) {
    // TODO implement encrypt/decrypt
    return password;
  }

  async applyUsersList() {
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

  async applyGroupsList() {
    const toIgnore = Object.keys(this.localData.groups).filter(
      slug => this.localData.groups[slug] === "ignore"
    );
    const [toAdd, toChange, toRemove] = diffLists(
      Object.keys(this.localData.groups).filter(
        slug => !toIgnore.includes(slug)
      ),
      Object.keys(this.remoteData.groups).filter(
        slug => !toIgnore.includes(slug)
      )
    );

    for (const groupName of toAdd) {
      const localGroup = this.localData.groups[groupName];
      await this.client.post("admin/groups", {
        query: { name: groupName }
      });
      // add permissions
      if (localGroup.permission) {
        await this.client.put("admin/permissions/groups", {
          query: { name: groupName, permission: localGroup.permission }
        });
      }

      if (localGroup.members !== "ignore") {
        for (const userSlug of localGroup.members || []) {
          await this.client.post("admin/groups/add-user", {
            data: { context: groupName, itemName: userSlug }
          });
        }
      }
    }

    for (const groupName of toRemove) {
      const remoteGroup = this.remoteData.groups[groupName];
      for (const userSlug of remoteGroup.members || []) {
        await this.client.post("admin/groups/remove-user", {
          data: { context: groupName, itemName: userSlug }
        });
      }
      await this.client.delete("admin/permissions/groups", {
        query: { name: groupName }
      });
      await this.client.delete("admin/groups", {
        query: { name: groupName }
      });
    }

    for (const groupName of toChange) {
      const localGroup = this.localData.groups[groupName];
      const remoteGroup = this.remoteData.groups[groupName];

      if (
        localGroup.permission &&
        localGroup.permission !== remoteGroup.permission
      ) {
        await this.client.put("admin/permissions/groups", {
          query: { name: groupName, permission: localGroup.permission }
        });
      }
      if (!localGroup.permission && remoteGroup.permission) {
        await this.client.delete("admin/permissions/groups", {
          query: { name: groupName }
        });
      }
      if (localGroup.permission) {
        await this.client.put("admin/permissions/groups", {
          query: { name: groupName, permission: localGroup.permission }
        });
      }

      if (localGroup.members !== "ignore") {
        const [usersToAdd, , usersToRemove] = diffLists(
          localGroup.members || [],
          remoteGroup.members || []
        );

        for (const userSlug of usersToAdd) {
          await this.client.post("admin/groups/add-user", {
            data: { context: groupName, itemName: userSlug }
          });
        }

        for (const userSlug of usersToRemove) {
          await this.client.post("admin/groups/remove-user", {
            data: { context: groupName, itemName: userSlug }
          });
        }
      }
    }
  }

  async applyProjectsList() {
    const toIgnore = Object.keys(this.localData.projects).filter(
      slug => this.localData.projects[slug] === "ignore"
    );
    const [toAdd, toChange, toRemove] = diffLists(
      Object.keys(this.localData.projects).filter(
        slug => !toIgnore.includes(slug)
      ),
      Object.keys(this.remoteData.projects).filter(
        slug => !toIgnore.includes(slug)
      )
    );

    for (const projectKey of toAdd) {
      const localProject = this.localData.projects[projectKey];
      await this.client.post("projects", {
        data: {
          key: projectKey,
          name: localProject.name,
          description: localProject.description
        }
      });
    }

    for (const projectKey of toRemove) {
      await this.client.delete(`projects/${projectKey}`);
    }

    for (const projectKey of toChange) {
      const localProject = this.localData.projects[projectKey];
      const remoteProject = this.remoteData.projects[projectKey];
      if (
        localProject.name !== remoteProject.name ||
        localProject.description !== remoteProject.description ||
        localProject.public !== remoteProject.public
      ) {
        await this.client.put(`projects/${projectKey}`, {
          data: {
            key: projectKey,
            name: localProject.name,
            description: localProject.description
          }
        });
      }
    }
  }
  async apply() {
    if (!this.remoteData) {
      await this.fetchState();
    }
    await this.applyUsersList();
    await this.applyGroupsList();
    await this.applyProjectsList();
  }

  async fetchUsers() {
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

  async fetchGroups() {
    this.remoteData.groups = this.remoteData.groups || {};

    // Getting all groups
    (await this.client.get("admin/groups", {
      query: { limit: 1000 }
    })).values.forEach(({ name /* deletable */ }) => {
      this.remoteData.groups[name] = {};
    });

    // Group permissions
    (await this.client.get("admin/permissions/groups", {
      query: { limit: 1000 }
    })).values.forEach(({ group: { name }, permission }) => {
      this.remoteData.groups[name].permission = permission;
    });

    // Group members
    // TODO Rework for readability
    await Promise.all(
      Object.keys(this.remoteData.groups).map(async name => {
        const members = (await this.client.get("admin/groups/more-members", {
          query: { limit: 1000, context: name }
        })).values.map(({ slug }) => slug);
        this.remoteData.groups[name].members = members;
      })
    );
  }

  async fetchProjects() {
    this.remoteData.projects = {};

    (await this.client.get("projects", {
      query: { limit: 1000 }
    })).values.forEach(
      // public is a reserved word in strict mode
      ({ key, name, description, type, ..._ }) =>
        (this.remoteData.projects[key] = {
          name,
          description,
          public: _.public,
          type
        })
    );

    // await Object.keys(this.remoteData.projects).map(async projectKey => {
    //   const pgPermissionsList = await this._fetchJson(
    //     `projects/${projectKey}/permissions/groups`,
    //     {
    //       query: { limit: 1000 }
    //     }
    //   );
    //   // TODO
    // });
  }

  async fetchState() {
    this.remoteData = {};
    await this.fetchUsers();
    await this.fetchGroups();
    await this.fetchProjects();
  }
}

module.exports = {
  Application
};
