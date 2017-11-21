class Repos {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }

  async fetchRepos(key) {
    const data = await this.client.getAll(`rest/api/1.0/projects/${key}/repos`);
    return data.values.map(({ slug, scmId, state, forkable, ..._ }) => ({
      [slug]: {
        scmId,
        state,
        forkable,
        public: _.public
      }
    }));
  }

  async fetch(path, item) {
    await this.app.match(["projects", ":arg"], path, async key => {
      item.repos = await this.fetchRepos(key);
    });
  }

  async createRepo(key, slug, data) {
    await this.client.post(`rest/api/1.0/projects/${key}/repos`, {
      data: { name: slug, ...data }
    });
  }
  async deleteRepo(key, slug) {
    await this.client.delete(`rest/api/1.0/projects/${key}/repos/${slug}`);
  }

  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "repos", ":arg"],
      path,
      async (key, slug) => {
        if (remote === undefined) {
          const { scmId, forkable } = local;
          await this.createRepo(key, slug, {
            scmId,
            forkable
          });
        } else if (local === undefined) {
          await this.deleteRepo(key, slug);
        } else {
          //
        }
      }
    );
  }
}

module.exports = app => new Repos(app);
