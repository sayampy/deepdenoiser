const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Enables R8 optimized resource shrinking (AGP 8.12+) which integrates
 * resource and code optimization into a single pass, removing resources
 * referenced only from unused code.
 */
module.exports = function withR8Optimization(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: "property",
      key: "android.r8.optimizedResourceShrinking",
      value: "true",
    });
    return config;
  });
};
