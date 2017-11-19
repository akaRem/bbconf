const { diffIgnoreableObjects } = require("../util");
const { Repos } = require("./projects-repos");
const { Permissions } = require("./projects-permissions");
class Projects {
  constructor(app) {
    this.app = app;
    this.repos = new Repos(this.app);
    this.permissions = new Permissions(this.app);
  }

  get client() {
    return this.app.client;
  }

  async fetchProjects(projects = {}) {
    const data = await this.client.getAll("rest/api/1.0/projects");
    data.values.forEach(
      // public is a reserved word in strict mode
      ({ key, name, description, type, ..._ }) =>
        (projects[key] = {
          name,
          description,
          public: _.public,
          type
        })
    );
    return projects;
  }

  async fetch(projects = {}) {
    projects = await this.fetchProjects(projects);
    projects = await this.permissions.fetch(projects);
    projects = await this.repos.fetch(projects);
    return projects;
  }

  async createProject(data) {
    await this.client.post("rest/api/1.0/projects", { data });
  }

  async updateProject(key, data) {
    await this.client.put(`rest/api/1.0/projects/${key}`, {
      data: { key, ...data }
    });
  }

  async deleteProject(key) {
    await this.client.delete(`rest/api/1.0/projects/${key}`);
  }

  async apply(local, remote) {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(local, remote);

    for (const key of toAdd) {
      const { name, description, permissions } = local[key];
      await this.createProject({ key, name, description });
      await this.permissions.apply(key, permissions);
      await this.repos.apply(key, local[key].repos);
    }

    for (const key of toRemove) {
      await this.permissions.apply(key, {}, remote[key].permissions);
      await this.repos.apply(key, {}, remote[key].repos);

      await this.deleteProject(key);
    }

    for (const key of toChange) {
      const localProject = local[key];
      const remoteProject = remote[key];
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

      await this.repos.apply(key, local[key].repos, remote[key].repos);
    }
  }
}

module.exports = {
  Projects
};
