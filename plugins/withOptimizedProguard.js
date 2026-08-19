const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Switches the release build from proguard-android.txt (which includes
 * -dontoptimize) to proguard-android-optimize.txt so R8 actually applies
 * code optimizations (inlining, class merging, etc.).
 */
module.exports = function withOptimizedProguard(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      'getDefaultProguardFile("proguard-android.txt")',
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    return config;
  });
};
