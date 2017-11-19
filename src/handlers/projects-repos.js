const { diffIgnoreableObjects } = require("../util");
const { Init } = require("./projects-repos-init");
class Repos {
  constructor(app) {
    this.app = app;
    this.init = new Init(this.app);
  }

  get client() {
    return this.app.client;
  }

  async fetch(projects) {
    for (const key of Object.keys(projects)) {
      projects[key].repos = {};
      const data = await this.client.getAll(
        `rest/api/1.0/projects/${key}/repos`
      );
      data.values.forEach(({ slug, scmId, state, forkable, ..._ }) => {
        projects[key].repos[slug] = {
          scmId,
          state,
          forkable,
          public: _.public
        };
      });
    }
    return projects;
  }

  async createRepo(key, slug, data) {
    await this.client.post(`rest/api/1.0/projects/${key}/repos`, {
      data: { name: slug, ...data }
    });
  }
  async deleteRepo(key, slug) {
    await this.client.delete(`rest/api/1.0/projects/${key}/repos/${slug}`);
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      const [toAdd, , toRemove] = diffIgnoreableObjects(
        local || {},
        remote || {}
      );
      for (const slug of toAdd) {
        const { scmId, forkable } = local[slug];
        await this.createRepo(key, slug, {
          scmId,
          forkable
        });
        await this.init.apply(key, slug, local[slug]);
      }

      for (const slug of toRemove) {
        await this.deleteRepo(key, slug);
      }
    }
  }
}

module.exports = {
  Repos
};
