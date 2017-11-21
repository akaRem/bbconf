const tmp = require("tmp");
const fs = require("fs");
const pathMod = require("path");
const { execFile } = require("child_process");

class Init {
  constructor(app) {
    this.app = app;
  }

  get client() {
    return this.app.client;
  }
  fetch() {}
  async apply(path, local, remote) {
    await this.app.match(
      ["projects", ":arg", "repos", ":arg"],
      path,
      async (key, repo) => {
        if (remote !== undefined) {
          return;
        }

        if (local.init && !this.app.shouldIgnore(local.init)) {
          // FIXME switch to async execution
          const tmpobj = await new Promise((resolve, reject) =>
            tmp.dir(
              {
                mode: "0777",
                template: "/tmp/tmp-XXXXXX",
                keep: false, // all tempfiles are removed on process exit
                unsafeCleanup: true
              },
              (error, name, removeCallback) =>
                error ? reject(error) : resolve({ name, removeCallback })
            )
          );

          const executablePath = pathMod.join(tmpobj.name, "init-repo");

          await new Promise((resolve, reject) => {
            fs.writeFile(
              executablePath,
              local.init,
              error => (error ? reject(error) : resolve())
            );
          });

          await new Promise((resolve, reject) => {
            fs.chmod(
              executablePath,
              "0777",
              error => (error ? reject(error) : resolve())
            );
          });

          // eslint-disable-next-line no-unused-vars
          const stdout = await new Promise((resolve, reject) =>
            execFile(
              executablePath,
              {
                cwd: tmpobj.name,
                env: {
                  BBCONF_USER: this.app.connection.user,
                  BBCONF_USER_EMAIL: this.app.connection.email,
                  BBCONF_PASSWORD: this.app.connection.password,
                  // TODO split sheme, uri, port and base
                  BBCONF_BASE_URL: this.app.connection.baseUrl,
                  BBCONF_BASE: this.app.baseDir,
                  BBCONF_PROJECT_KEY: key,
                  BBCONF_REPO_SLUG: repo,
                  BBCONF_REPO_SCM: local.scmId
                }
              },
              // eslint-disable-next-line no-unused-vars
              (error, stdout, stderr) =>
                error ? reject(error) : resolve(stdout)
            )
          );

          // keep = false, but let's remove anyway
          tmpobj.removeCallback();
        }
      }
    );
  }
}

module.exports = app => new Init(app);
