const fetch = require("isomorphic-fetch");
const urljoin = require("url-join");
const querystring = require("querystring");

class Application {
  constructor(options) {
    this.connectionOptions = options.connection;
    this.localData = options.config;
    this.remoteData = null;
  }

  async _fetch(apiEndpoint, { method, data, query }) {
    const baseUrl = this.connectionOptions.baseUrl;
    const password = this.connectionOptions.password;
    const user = this.connectionOptions.user;
    const apiUrl = "rest/api/1.0";

    const fullUrl = urljoin(
      baseUrl,
      apiUrl,
      apiEndpoint,
      query ? "?" + querystring.stringify(query) : ""
    );

    return await fetch(fullUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${new Buffer(`${user}:${password}`).toString(
          "base64"
        )}`
      },
      method: method || "GET",
      body: data ? JSON.stringify(data) : ""
    });
  }

  async _fetchJson(...args) {
    // FIXME http codes handling
    return await this._fetch(...args).then(
      response => (response.status !== 204 ? response.json() : {})
    );
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
          await this._fetchJson("admin/users", {
            method: "POST",
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
            await this._fetchJson("admin/permissions/users", {
              method: "PUT",
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
            await this._fetchJson("admin/permissions/users", {
              method: "DELETE",
              query: { name: userSlug }
            });
          }
          await this._fetchJson("admin/users", {
            method: "DELETE",
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
            await this._fetchJson("admin/users", {
              method: "PUT",
              data: {
                name: userSlug,
                displayName: localUser.displayName,
                email: localUser.email
              }
            });
          }

          if (!localUser.permission && remoteUser.permission) {
            // remove permission
            await this._fetchJson("admin/permissions/users", {
              method: "DELETE",
              query: { name: userSlug }
            });
          }

          if (
            localUser.permission &&
            localUser.permission !== remoteUser.permission
          ) {
            // change permission
            await this._fetchJson("admin/permissions/users", {
              method: "PUT",
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
          await this._fetchJson("admin/groups", {
            method: "POST",
            query: {
              name: groupName
            }
          });
          // add permissions
          if (localGroup.permission) {
            await this._fetchJson("admin/permissions/groups", {
              method: "PUT",
              query: {
                name: groupName,
                permission: localGroup.permission
              }
            });
          }
        }

        if (!localGroup && remoteGroup) {
          await this._fetchJson("admin/permissions/groups", {
            method: "DELETE",
            query: {
              name: groupName
            }
          });
          await this._fetchJson("admin/groups", {
            method: "DELETE",
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
            await this._fetchJson("admin/permissions/groups", {
              method: "PUT",
              query: {
                name: groupName,
                permission: localGroup.permission
              }
            });
          }
          if (!localGroup.permission && remoteGroup.permission) {
            await this._fetchJson("admin/permissions/groups", {
              method: "DELETE",
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
            await this._fetch("admin/groups/add-user", {
              method: "POST",
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
            await this._fetch("admin/groups/remove-user", {
              method: "POST",
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

  async apply() {
    if (!this.remoteData) {
      await this.fetchState();
    }
    await this.applyUsersList();
    await this.applyGroupsList();
    await this.applyUsersToGroups();
  }

  async fetchUsers() {
    this.remoteData.users = this.remoteData.users || {};

    // Get users and their details
    (await this._fetchJson("admin/users", {
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
    (await this._fetchJson("admin/permissions/users", {
      query: { limit: 1000 }
    })).values.forEach(
      ({ user: { slug }, permission }) =>
        (this.remoteData.users[slug].permission = permission)
    );
  }

  async fetchGroups() {
    this.remoteData.groups = this.remoteData.groups || {};

    // Getting all groups
    (await this._fetchJson("admin/groups", {
      query: { limit: 1000 }
    })).values.forEach(({ name /* deletable */ }) => {
      this.remoteData.groups[name] = {};
    });

    // Group permissions
    (await this._fetchJson("admin/permissions/groups", {
      query: { limit: 1000 }
    })).values.forEach(({ group: { name }, permission }) => {
      this.remoteData.groups[name].permission = permission;
    });

    // Group members
    // TODO Rework for readability
    await Promise.all(
      Object.keys(this.remoteData.groups).map(async name => {
        const members = (await this._fetchJson("admin/groups/more-members", {
          query: { limit: 1000, context: name }
        })).values.map(({ slug }) => slug);
        this.remoteData.groups[name].members = members;
      })
    );
  }

  async fetchProjects() {
    this.remoteData.projects = {};

    (await this._fetchJson("projects", {
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
