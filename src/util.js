const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");

const diffLists = (a, b) => {
  const onlyInA = a.filter(i => !b.includes(i));
  const onlyInB = b.filter(i => !a.includes(i));
  const both = a.filter(i => b.includes(i));
  return [onlyInA, both, onlyInB];
};

const loadYaml = (...paths) =>
  yaml.safeLoad(fs.readFileSync(path.join(...paths), "utf8"));

module.exports = {
  diffLists,
  loadYaml
};
