const { Client } = require("./client");
const { Users } = require("./handlers/users");
const { Groups } = require("./handlers/groups");
const { Projects } = require("./handlers/projects");

class Application {
  constructor(options) {
    this.local = options.config;
    this.remote = {};
    this.client = new Client(options.connection);

    this.users = new Users(this);
    this.groups = new Groups(this);
    this.projects = new Projects(this);
  }

  async _decrypt(password) {
    // TODO implement encrypt/decrypt
    return password;
  }

  async apply() {
    await this.fetch();

    await this.users.apply(this.local.users, this.remote.users);
    await this.groups.apply(this.local.groups, this.remote.groups);
    await this.projects.apply(this.local.projects, this.remote.projects);
  }

  async fetch() {
    this.remote.users = await this.users.fetch();
    this.remote.groups = await this.groups.fetch();
    this.remote.projects = await this.projects.fetch();
  }
}

module.exports = {
  Application
};
