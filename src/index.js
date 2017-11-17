const { Client } = require("./client");
const { Users } = require("./handlers/users");
const { Groups } = require("./handlers/groups");
const { Projects } = require("./handlers/projects");

class Application {
  constructor(options) {
    this.localData = options.config;
    this.remoteData = {};
    this.client = new Client(options.connection);

    this.usersManager = new Users(this);
    this.groupsManager = new Groups(this);
    this.projectsManager = new Projects(this);
  }

  async _decrypt(password) {
    // TODO implement encrypt/decrypt
    return password;
  }

  async apply() {
    if (!this.remoteData.length) {
      await this.fetch();
    }
    await this.usersManager.apply();
    await this.groupsManager.apply();
    await this.projectsManager.apply();
  }

  async fetch() {
    await this.usersManager.fetch();
    await this.groupsManager.fetch();
    await this.projectsManager.fetch();
  }
}

module.exports = {
  Application
};
