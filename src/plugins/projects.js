class Projects {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetchProjects() {
    const data = await this.client.getAll("rest/api/1.0/projects");
    return data.values.sort((a, b) => a.key > b.key).map(
      // public is a reserved word in strict mode
      ({ key, name, description, type, ..._ }) => ({
        [key]: {
          name,
          description,
          public: _.public,
          type
        }
      })
    );
  }

  async fetch(path, item) {
    await this.app.match([], path, async () => {
      const projects = await this.fetchProjects();
      item.push({ projects });
    });
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

  async apply(path, local, remote) {
    await this.app.match(["projects", ":arg"], path, async key => {
      if (remote === undefined) {
        const { name, description } = local;
        await this.createProject({ key, name, description });
      } else if (local === undefined) {
        await this.deleteProject(key);
      } else {
        if (
          local.name !== remote.name ||
          local.description !== remote.description ||
          local.public !== remote.public
        ) {
          await this.updateProject(key, {
            name: local.name,
            description: local.description
          });
        }
      }
    });
  }
}

module.exports = app => new Projects(app);
