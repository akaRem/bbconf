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

  async fetchRepos() {
    for (const key of Object.keys(this.remoteData.projects)) {
      this.remoteData.projects[key].repos = {};
      const data = await this.client.getAll(`projects/${key}/repos`);
      data.values.forEach(({ slug, scmId, state, forkable, ..._ }) => {
        this.remoteData.projects[key].repos[slug] = {
          scmId,
          state,
          forkable,
          public: _.public
        };
      });
    }
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
    await this.fetchRepos();
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

  async createRepo(key, slug, data) {
    await this.client.post(`projects/${key}/repos`, {
      data: { name: slug, ...data }
    });
  }
  async deleteRepo(key, slug) {
    await this.client.delete(`projects/${key}/repos/${slug}`);
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

      const repos = this.localData.projects[key].repos || {};
      for (const slug of Object.keys(repos)) {
        const { scmId, forkable } = repos[slug];
        this.createRepo(key, slug, {
          scmId,
          forkable
        });
      }
    }

    for (const key of toRemove) {
      const permissions = this.remoteData.projects[key].permissions;
      if (permissions && permissions.groups) {
        for (const group of Object.keys(permissions.groups)) {
          this.removeProjectGroupsPermission(key, group);
        }
      }
      const repos = this.remoteData.projects[key].repos || {};
      for (const slug of Object.keys(repos)) {
        this.deleteRepo(key, slug);
      }
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
    }
  }
}

module.exports = {
  ProjectsManager
};
