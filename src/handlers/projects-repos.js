const { diffIgnoreableObjects } = require("../util");

class Repos {
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
