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
    await this.fetch();
    await this.usersManager.apply(this.localData.users, this.remoteData.users);
    await this.groupsManager.apply(
      this.localData.groups,
      this.remoteData.groups
    );
    await this.projectsManager.apply();
  }

  async fetch() {
    this.remoteData.users = await this.usersManager.fetch();
    this.remoteData.groups = await this.groupsManager.fetch();
    await this.projectsManager.fetch();
  }
}

module.exports = {
  Application
};
