const yargs = require("yargs");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");
const { Application } = require("./index");

const loadYaml = (...paths) =>
  yaml.safeLoad(fs.readFileSync(path.join(...paths), "utf8"));

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
  const app = new Application(cwd, opts);
  await app.apply();
  console.log(yaml.dump(app.client.audit));
  return app;
};

module.exports = {
  cli
};

if (require.main === module) {
  cli(path.resolve("."), process.argv.slice(1));
}
