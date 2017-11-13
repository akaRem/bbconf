const { Client } = require("./client");

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
    for (const userSlug of new Set([
      ...Object.keys(this.localData.users),
      ...Object.keys(this.remoteData.users)
    ])) {
      const localUser = this.localData.users[userSlug];
      const remoteUser = this.remoteData.users[userSlug];
      if (localUser !== "ignore") {
        if (localUser && !remoteUser) {
          // create user
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
              query: {
                permission: localUser.permission,
                name: userSlug
              }
            });
          }
        }

        if (!localUser && remoteUser) {
          // remove user
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

        if (localUser && remoteUser) {
          // sync users
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
              query: {
                permission: localUser.permission,
                name: userSlug
              }
            });
          }
        }
      }
    }
  }

  async applyGroupsList() {
    for (const groupName of new Set([
      ...Object.keys(this.localData.groups),
      ...Object.keys(this.remoteData.groups)
    ])) {
      const localGroup = this.localData.groups[groupName];
      const remoteGroup = this.remoteData.groups[groupName];

      if (localGroup !== "ignore") {
        if (localGroup && !remoteGroup) {
          await this.client.post("admin/groups", {
            query: {
              name: groupName
            }
          });
          // add permissions
          if (localGroup.permission) {
            await this.client.put("admin/permissions/groups", {
              query: {
                name: groupName,
                permission: localGroup.permission
              }
            });
          }
        }

        if (!localGroup && remoteGroup) {
          await this.client.delete("admin/permissions/groups", {
            query: {
              name: groupName
            }
          });
          await this.client.delete("admin/groups", {
            query: {
              name: groupName
            }
          });
        }

        if (localGroup && remoteGroup) {
          if (
            localGroup.permission &&
            localGroup.permission !== remoteGroup.permission
          ) {
            await this.client.put("admin/permissions/groups", {
              method: "PUT",
              query: {
                name: groupName,
                permission: localGroup.permission
              }
            });
          }
          if (!localGroup.permission && remoteGroup.permission) {
            await this.client.delete("admin/permissions/groups", {
              query: {
                name: groupName
              }
            });
          }
        }
      }
    }
  }

  async applyUsersToGroups() {
    for (const groupName of new Set([
      ...Object.keys(this.localData.groups),
      ...Object.keys(this.remoteData.groups)
    ])) {
      const localGroup = this.localData.groups[groupName] || {};
      const remoteGroup = this.remoteData.groups[groupName] || {};
      const localMembers = localGroup.members || [];
      const remoteMembers = remoteGroup.members || [];

      if (localGroup !== "ignore" && localGroup.members !== "ignore") {
        for (const userSlug of new Set([...localMembers, ...remoteMembers])) {
          if (
            localMembers.indexOf(userSlug) !== -1 &&
            remoteMembers.indexOf(userSlug) === -1
          ) {
            // Add user to group
            // FIXME Check that r.code is 200 ?
            await this.client.post("admin/groups/add-user", {
              data: {
                context: groupName,
                itemName: userSlug
              }
            });
          }

          if (
            localMembers.indexOf(userSlug) === -1 &&
            remoteMembers.indexOf(userSlug) !== -1
          ) {
            // remove user from group
            // FIXME Check that r.code is 200 ?
            await this.client.post("admin/groups/remove-user", {
              data: {
                context: groupName,
                itemName: userSlug
              }
            });
          }
        }
      }
    }
  }
  async applyProjectsList() {
    for (const projectKey of new Set([
      ...Object.keys(this.localData.projects),
      ...Object.keys(this.remoteData.projects)
    ])) {
      const localProject = this.localData.projects[projectKey];
      const remoteProject = this.remoteData.projects[projectKey];
      if (localProject !== "ignore") {
        if (localProject && !remoteProject) {
          await this.client.post("projects", {
            data: {
              key: projectKey,
              name: localProject.name,
              description: localProject.description
            }
          });
        }

        if (!localProject && remoteProject) {
          await this.client.delete(`projects/${projectKey}`);
        }

        if (localProject && remoteProject) {
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
    }
  }
  async apply() {
    if (!this.remoteData) {
      await this.fetchState();
    }
    await this.applyUsersList();
    await this.applyGroupsList();
    await this.applyUsersToGroups();
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
