class PluginFactory {
  constructor(app, name) {
    this.app = app;
    this.name = name;
    this.logger = app.logger.getLogger(this.name);

    this.fetchCallbacks = [];
    this.applyCallbacks = [];
  }
  addFetchHandler(pattern, cb) {
    const fetchCallback = async (path, item) =>
      await this.app.match(pattern, path, async (...args) => {
        return await cb(item, args);
      });
    this.fetchCallbacks.push(fetchCallback);
    return this;
  }
  addApplyHandler(pattern, cb) {
    const applyCallback = async (path, local, remote) =>
      await this.app.match(pattern, path, async (...args) => {
        return await cb(local, remote, args);
      });
    this.applyCallbacks.push(applyCallback);
    return this;
  }

  async fetch(path, item) {
    for (const fetchCallback of this.fetchCallbacks) {
      await fetchCallback(path, item);
    }
  }

  async apply(path, local, remote) {
    for (const applyCallback of this.applyCallbacks) {
      await applyCallback(path, local, remote);
    }
  }
}

module.exports = {
  PluginFactory
};
