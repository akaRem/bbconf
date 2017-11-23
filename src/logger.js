const chalk = require("chalk");

// TODO switch to winston or smth like that
// TODO tests
class Logger {
  constructor({ writeConsole, colorize, verbosity }) {
    this.writeConsole = writeConsole || false;
    this.colorize = colorize || false;
    this.verbosity = verbosity || 4;

    this.console = console; // for testing purposes save ref in fields

    // constants and mappings
    this.levelMapping = {
      ERROR: "red",
      WARN: "orange",
      INFO: "yellow",
      VERBOSE: "green",
      DEBUG: "cyan"
    };
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      VERBOSE: 3,
      DEBUG: 4
    };

    // aggregators
    this.labelColors = {};
    this.entries = [];
  }

  getLblColor(lbl) {
    const avlColors = ["green", "yellow", "cyan", "orange"];
    const color = this.labelColors[lbl];
    if (color) {
      return color;
    } else {
      const avlColorsIdx =
        Object.keys(this.labelColors).length % avlColors.length;
      const newColor = avlColors[avlColorsIdx];
      this.labelColors[lbl] = newColor;
      return newColor;
    }
  }

  prepareLabel(label) {
    if (this.colorize) {
      return chalk[this.getLblColor(label)](label);
    } else {
      return label;
    }
  }

  getLvlColor(level) {
    return this.levelMapping[level] || "";
  }

  prepareLevel(level) {
    if (this.colorize) {
      return chalk[this.getLvlColor(level)](`[${level}]`);
    } else {
      return level;
    }
  }

  log({ level, message, label, details }) {
    this.entries.push({ level, message, label, details });
    if (this.verbosity < this.levels[level]) {
      return;
    }
    if (this.writeConsole) {
      level = this.prepareLevel(level);
      label = this.prepareLabel(label);
      this.console.log(`${level}\t | ${label} | ${message}`);
    }
  }

  getLogger(label) {
    return {
      error: (message, details) =>
        this.log({ level: "ERROR", label, message, details }),
      warn: (message, details) =>
        this.log({ level: "WARN", label, message, details }),
      info: (message, details) =>
        this.log({ level: "INFO", label, message, details }),
      verbose: (message, details) =>
        this.log({ level: "VERBOSE", label, message, details }),
      debug: (message, details) =>
        this.log({ level: "DEBUG", label, message, details })
    };
  }
}

module.exports = {
  Logger
};
