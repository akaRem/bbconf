const { Client } = require("./client");
const isObject = require("isobject");

const yargs = require("yargs");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const { Logger } = require("./logger");
const PluginFactory = require("./plugin-factory");

const diffLists = (a, b) => {
  a = a || [];
  b = b || [];
  const onlyInA = a.filter(i => !b.includes(i));
  const onlyInB = b.filter(i => !a.includes(i));
  const both = a.filter(i => b.includes(i));
  return [onlyInA, both, onlyInB];
};

const loadYaml = (...paths) =>
  yaml.safeLoad(fs.readFileSync(path.join(...paths), "utf8"));

const sortedMap = {
  getKeys: obj => {
    return obj.map(i => Object.keys(i)[0]);
  },
  getItem: (obj, key) => {
    return (obj.find(i => Object.keys(i)[0] === key) || {})[key];
  },
  setItem: (obj, key, value) => {
    obj.find(i => Object.keys(i)[0] === key)[key] = value;
  },
  isSortedMap: obj => {
    return (
      Array.isArray(obj) &&
      // obj.length > 1 &&
      obj.every(i => isObject(i) && Object.keys(i).length === 1)
    );
  }
};

class Application {
  constructor(baseDir, options) {
    this.baseDir = baseDir;
    this.local = options.config;
    this.remote = {};
    this.connection = options.connection;
    this.logger = new Logger(options.logger || {});
    this.client = new Client(this, options.connection);

    this.plugins = [
      require("./plugins/users"),
      require("./plugins/users-permission"),
      require("./plugins/users-keys"),
      require("./plugins/groups"),
      require("./plugins/groups-permission"),
      require("./plugins/groups-members"),
      require("./plugins/projects"),
      require("./plugins/projects-permissions-users"),
      require("./plugins/projects-permissions-groups"),
      require("./plugins/projects-repos"),
      require("./plugins/projects-repos-permissions-users"),
      require("./plugins/projects-repos-permissions-groups"),
      require("./plugins/projects-repos-init")
    ].map(p => p(this));
    this.sortedMap = sortedMap;
    this.diffLists = diffLists;
  }

  plugin(name) {
    return new PluginFactory(this, name);
  }

  shouldIgnore(item) {
    return item === "ignore";
  }

  async _decrypt(password) {
    // TODO implement encrypt/decrypt
    return password;
  }

  async match(pattern, path, cb) {
    if (pattern.length !== path.length) {
      return;
    }

    const args = [];
    for (let i = 0; i < pattern.length; ++i) {
      const patternEl = pattern[i];
      const pathEl = path[i];
      if (patternEl === ":arg") {
        args.push(pathEl);
      } else if (patternEl === ":any") {
        continue;
      } else if (patternEl !== pathEl) {
        return;
      }
    }
    return await cb(...args);
  }

  async traverse1(path, item, cb) {
    await cb(path, item);
    if (sortedMap.isSortedMap(item)) {
      const keysOfItem = sortedMap.getKeys(item);
      for (const key of keysOfItem) {
        const subPath = [...path, key];
        const subItem = sortedMap.getItem(item, key);
        await this.traverse1(subPath, subItem, cb);
      }
    } else if (isObject(item)) {
      const keysOfItem = Object.keys(item);
      for (const key of keysOfItem) {
        const subPath = [...path, key];
        const subItem = item[key];
        await this.traverse1(subPath, subItem, cb);
      }
      // } else if (Array.isArray(item)) {
    } else {
      // console.log("traverse1", path, item);
    }
  }

  async traverse2(path, itemA, itemB, cb) {
    if (this.shouldIgnore(itemA)) {
      return;
    }
    await cb(path, itemA, itemB);
    if (
      (sortedMap.isSortedMap(itemA) && sortedMap.isSortedMap(itemB)) ||
      (itemA === undefined && sortedMap.isSortedMap(itemB)) ||
      (sortedMap.isSortedMap(itemA) && itemB === undefined)
    ) {
      const keysOfItemA = sortedMap.getKeys(itemA || []);
      const keysOfItemB = sortedMap.getKeys(itemB || []);
      const [onlyInA, inBoth, onlyInB] = diffLists(keysOfItemA, keysOfItemB);
      for (const keyGroup of [onlyInA, inBoth, onlyInB]) {
        for (const key of keyGroup) {
          const subPath = [...path, key];
          const subItemA = sortedMap.getItem(itemA || [], key);
          const subItemB = sortedMap.getItem(itemB || [], key);
          await this.traverse2(subPath, subItemA, subItemB, cb);
        }
      }
    } else if (
      (isObject(itemA) && isObject(itemB)) ||
      (itemA === undefined && isObject(itemB)) ||
      (isObject(itemA) && itemB === undefined)
    ) {
      const keysOfItemA = Object.keys(itemA || {});
      const keysOfItemB = Object.keys(itemB || {});
      const [onlyInA, inBoth, onlyInB] = diffLists(keysOfItemA, keysOfItemB);
      for (const keyGroup of [onlyInA, inBoth, onlyInB]) {
        for (const key of keyGroup) {
          const subPath = [...path, key];
          const subItemA = (itemA || {})[key];
          const subItemB = (itemB || {})[key];
          await this.traverse2(subPath, subItemA, subItemB, cb);
        }
      }
    } else {
      // console.log("traverse2", path, itemA, itemB);
    }
  }

  async apply() {
    await this.fetch();
    await this.traverse2(
      [],
      this.local,
      this.remote,
      async (path, local, remote) => {
        for (const plugin of this.plugins) {
          await plugin.apply(path, local, remote);
        }
      }
    );
  }

  async fetch() {
    this.remote = [];
    await this.traverse1([], this.remote, async (path, item) => {
      for (const plugin of this.plugins) {
        await plugin.fetch(path, item);
      }
    });
  }
}

const cli = async (cwd, args) => {
  const opts = yargs()
    .env("BBCONF")
    .option("c", {
      alias: "connection",
      description: "Path to config file",
      coerce: opt => {
        return loadYaml(cwd, opt).connection;
      }
    })
    .option("dryRun", {
      description: "Just check, dont really change anything",
      type: "boolean",
      default: false
    })
    .option("logger.writeConsole", {
      type: "boolean",
      default: true,
      description: "Write logs in console"
    })
    .option("logger.colorize", {
      type: "boolean",
      default: true,
      description: "Write coloured logs in console"
    })
    .option("logger.outputFile", {
      description: "write full logs into provided file"
    })
    .option("export", {
      description: "Export config of current BB state into this file"
    })
    .option("i", {
      alias: "config",
      description: "Path to input file",
      coerce: opt => {
        return loadYaml(cwd, opt).config;
      }
    })
    .locale("en")
    .wrap(yargs.terminalWidth())
    .help()
    .parse(args);
  let app;
  try {
    app = new Application(cwd, {
      ...opts,
      connection: {
        ...(opts.connection || {}),
        dryRun: opts.dryRun
      }
    });
    if (opts.export) {
      await app.fetch();
      fs.writeFileSync(path.join(cwd, opts.export), yaml.dump(app.remote));
    }
    if (opts.apply) {
      await app.apply();
    }
  } finally {
    if (opts.logger.outputFile) {
      fs.writeFileSync(
        path.join(cwd, opts.logger.outputFile),
        yaml.dump(app.logger.entries)
      );
    }
  }
  return app;
};

if (require.main === module) {
  cli(path.resolve("."), process.argv.slice(1));
}
module.exports = {
  Application,
  loadYaml,
  cli
};
