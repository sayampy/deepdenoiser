const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withNdkVersion(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: "property",
      key: "ndkVersion",
      value: "28.1.13356709",
    });
    return config;
  });
};
