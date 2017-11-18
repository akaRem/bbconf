const { diffIgnoreableObjects } = require("../util");
const { Repos } = require("./projects-repos");
const { Permissions } = require("./projects-permissions");
class Projects {
  constructor(app) {
    this.app = app;
    this.repos = new Repos(this.app);
    this.permissions = new Permissions(this.app);
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

  async fetch() {
    this.remoteData.projects = this.remoteData.projects || {};
    await this.fetchProjects();
    await this.permissions.fetch(this.remoteData.projects);
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
      await this.permissions.apply(key, permissions);
      await this.repos.apply(key, this.localData.projects[key].repos);
    }

    for (const key of toRemove) {
      await this.permissions.apply(
        key,
        {},
        this.remoteData.projects[key].permissions
      );
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
      await this.permissions.apply(
        key,
        localProject.permissions,
        remoteProject.permissions
      );

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
