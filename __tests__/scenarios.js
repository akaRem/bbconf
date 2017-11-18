const { Application } = require("../src");
const { loadYaml } = require("../src/util");
const path = require("path");
const fs = require("fs");

describe("Scenarios bundle", async () => {
  const scenariosBaseDir = path.join(__dirname, "scenarios");
  const scenariosList = fs.readdirSync(scenariosBaseDir);

  // important note: all test/describe/it calls must be done during this tick!
  scenariosList.forEach(scenarioDir => {
    const baseDir = path.join(scenariosBaseDir, scenarioDir);

    const meta = loadYaml(baseDir, "__meta__.yaml");

    test(meta.description, async () => {
      // 1. Prepare server for tests via default config
      // TODO

      // 2. Simulate existing state via calling "apply" with provided config
      const setupApp = new Application(loadYaml(baseDir, "setup.yaml"));
      await setupApp.apply();

      // 3. Run scenario
      const app = new Application(loadYaml(baseDir, "config.yaml"));
      await app.apply();

      // 4. Get state and compare it with expectations
      const finalApp = new Application(loadYaml(baseDir, "config.yaml"));
      await finalApp.fetch();
      expect(finalApp.remote).toEqual(loadYaml(baseDir, "expectedState.yaml"));

      // 5. Run extra checks if necessary
      // TODO
    });
  });
});
