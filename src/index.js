const { Client } = require("./client");
const { UsersManager } = require("./users-manager");
const { GroupsManager } = require("./groups-manager");
const { ProjectsManager } = require("./projects-manager");

class Application {
  constructor(options) {
    this.localData = options.config;
    this.remoteData = {};
    this.client = new Client(options.connection);
    this.usersManager = new UsersManager(this);
    this.groupsManager = new GroupsManager(this);
    this.projectsManager = new ProjectsManager(this);
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
