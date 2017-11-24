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

  async importRepo(key, name, scmId, cloneUrl) {
    // THIS IS EXPERIMENTAL FEATURE
    // THIS API ENDPOINT IS PRIVATE AND NOT DOCUMENTED
    // NOT COVERED WITH TEST SUITE FOR NOW
    // (it's not good to clone something from github continuosly)
    try {
      const resp1 = await this.app.client.post(
        `/rest/importer/latest/projects/${key}/import/repos`,
        {
          data: {
            // it looks like this section is optional
            // source: {
            //   url: cloneUrl,
            //   type: "GIT",
            //   error: null,
            //   name: name
            // },
            // it looks like this section is optional
            // owner: "",
            // it looks like this section is optional
            // TODO add cfg option to provide username and password for import
            // credential: {
            //   username: "user",
            //   password: "password",
            //   error: null
            // },
            externalRepositories: [
              {
                cloneUrl: cloneUrl,
                name: name,
                // there was extra field in tcp dump, looks like it's optional
                // description: "Imported from <cloneUrl>",
                scmId: scmId
              }
            ]
          }
        }
      );
      // id of importing process
      const { jobId } = resp1;
      // FIXME add limitation for polling
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // wait for some time
        await new Promise(res => setTimeout(res, 1000));
        // check that import is done
        const resp2 = await this.app.client.get(
          `/rest/importer/latest/projects/${key}/import/job/${jobId}`
        );
        const statuses = resp2.tasks.map(t => t.state);
        if (statuses.some(s => s === "FAILED")) {
          // something went wrong ...
          // eslint-disable-next-line no-console
          console.log("something went wrong");
          break;
        }
        if (statuses.every(s => s === "SUCCESS")) {
          // ok
          // eslint-disable-next-line no-console
          console.log("ok");
          break;
        }
        if (!statuses.every(s => s === "STARTED" || s === "QUEUED")) {
          // ???
          // eslint-disable-next-line no-console
          console.log("???");
          break;
        }
      }
    } catch (e) {
      this.app.logger.getLogger("project-repos").error(e);
    }
  }

  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "repos", ":arg"],
      path,
      async (key, slug) => {
        if (remote === undefined) {
          const { scmId, forkable } = local;
          if (local.import) {
            // EXPERIMENTAL FEATURE
            await this.importRepo(key, slug, scmId, local.import);
          } else {
            await this.createRepo(key, slug, {
              scmId,
              forkable
            });
          }
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
