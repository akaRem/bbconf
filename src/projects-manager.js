const { diffLists } = require("./util");

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

  async fetch() {
    this.remoteData.projects = this.remoteData.projects || {};

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
  }
  async apply() {
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
}

module.exports = {
  ProjectsManager
};
