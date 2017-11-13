const { diffIgnoreableObjects } = require("./util");

class ProjectsManager {
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

  async apply() {
    const [toAdd, toChange, toRemove] = diffIgnoreableObjects(
      this.localData.projects,
      this.remoteData.projects
    );

    for (const key of toAdd) {
      const { name, description } = this.localData.projects[key];
      await this.createProject({ key, name, description });
    }

    for (const key of toRemove) {
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
    }
  }
}

module.exports = {
  ProjectsManager
};
