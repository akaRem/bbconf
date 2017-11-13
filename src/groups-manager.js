const { diffLists } = require("./util");

class GroupsManager {
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

  async fetch() {
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
  async apply() {
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
}

module.exports = {
  GroupsManager
};
