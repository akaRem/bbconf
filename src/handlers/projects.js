const { diffIgnoreableObjects } = require("../util");
const { Repos } = require("./projects-repos");

class Projects {
  constructor(app) {
    this.app = app;
    this.repos = new Repos(this.app);
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

  async fetchProjects() {
    const data = await this.client.getAll("projects");
    data.values.forEach(
      // public is a reserved word in strict mode
      ({ key, name, description, type, ..._ }) =>
        (this.remoteData.projects[key] = {
          name,
          description,
          public: _.public,
          type
        })
    );
  }

  async fetchGroupPermissions() {
    for (const key of Object.keys(this.remoteData.projects)) {
      this.remoteData.projects[key].permissions = {
        ...(this.remoteData.projects[key].permissions || {}),
        groups: {}
      };
      const data = await this.client.getAll(
        `projects/${key}/permissions/groups`
      );
      data.values.forEach(({ group: { name }, permission }) => {
        this.remoteData.projects[key].permissions.groups[name] = permission;
      });
    }
  }

  async fetch() {
    this.remoteData.projects = this.remoteData.projects || {};
    await this.fetchProjects();
    await this.fetchGroupPermissions();
    await this.repos.fetch();
  }

  async createProject(data) {
    await this.client.post("projects", { data });
  }

  async updateProject(key, data) {
    await this.client.put(`projects/${key}`, {
      data: { key, ...data }
    });
  }

  async deleteProject(key) {
    await this.client.delete(`projects/${key}`);
  }

  async setProjectGroupsPermission(key, group, permission) {
    await this.client.put(`projects/${key}/permissions/groups`, {
      query: {
        permission,
        name: group
      }
    });
  }

  async removeProjectGroupsPermission(key, group) {
    await this.client.delete(`projects/${key}/permissions/groups`, {
      query: {
        group
      }
    });
  }

  async apply() {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(
      this.localData.projects,
      this.remoteData.projects
    );

    for (const key of toAdd) {
      const { name, description, permissions } = this.localData.projects[key];
      await this.createProject({ key, name, description });

      if (permissions && permissions.groups) {
        for (const group of Object.keys(permissions.groups)) {
          this.setProjectGroupsPermission(
            key,
            group,
            permissions.groups[group]
          );
        }
      }

      await this.repos.apply(key, this.localData.projects[key].repos);
    }

    for (const key of toRemove) {
      const permissions = this.remoteData.projects[key].permissions;
      if (permissions && permissions.groups) {
        for (const group of Object.keys(permissions.groups)) {
          this.removeProjectGroupsPermission(key, group);
        }
      }

      await this.repos.apply(key, {}, this.remoteData.projects[key].repos);

      await this.deleteProject(key);
    }

    for (const key of toChange) {
      const localProject = this.localData.projects[key];
      const remoteProject = this.remoteData.projects[key];
      if (
        localProject.name !== remoteProject.name ||
        localProject.description !== remoteProject.description ||
        localProject.public !== remoteProject.public
      ) {
        await this.updateProject(key, {
          name: localProject.name,
          description: localProject.description
        });
      }
      if (localProject.permissions !== "ignore" && localProject.permissions) {
        const [
          groupToAdd,
          groupToChange,
          groupToRemove
        ] = diffIgnoreableObjects(
          localProject.permissions.groups || {},
          remoteProject.permissions.groups || {}
        );

        for (const group of groupToAdd) {
          this.setProjectGroupsPermission(
            key,
            group,
            localProject.permissions.groups[group]
          );
        }
        for (const group of groupToChange) {
          this.setProjectGroupsPermission(
            key,
            group,
            localProject.permissions.groups[group]
          );
        }
        for (const group of groupToRemove) {
          this.setProjectGroupsPermission(key, group);
        }
      }

      await this.repos.apply(
        key,
        this.localData.projects[key].repos,
        this.remoteData.projects[key].repos
      );
    }
  }
}

module.exports = {
  Projects
};
