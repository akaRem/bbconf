const { diffIgnoreableObjects } = require("../util");

class Repos {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetch(projects) {
    for (const key of Object.keys(projects)) {
      projects[key].repos = {};
      const data = await this.client.getAll(`projects/${key}/repos`);
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
    await this.client.post(`projects/${key}/repos`, {
      data: { name: slug, ...data }
    });
  }
  async deleteRepo(key, slug) {
    await this.client.delete(`projects/${key}/repos/${slug}`);
  }

  async apply(key, local = {}, remote = {}) {
    if (local !== "ignore") {
      const [toAdd, , toRemove] = diffIgnoreableObjects(
        local || {},
        remote || {}
      );
      for (const slug of toAdd) {
        const { scmId, forkable } = local[slug];
        this.createRepo(key, slug, {
          scmId,
          forkable
        });
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
