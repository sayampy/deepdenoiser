const { withSettingsGradle } = require("@expo/config-plugins");

/**
 * Keep release builds lean and distribution-specific at the native layer:
 *  - Play Core (expo-in-app-updates) is only linked for Play Store builds.
 *    GitHub builds self-update from a release APK via the system installer.
 *  - Dev-menu/Hermes tooling is only linked for development builds.
 *
 * The JS side aliases in-app-updates to a stub in metro.config.js.
 */
module.exports = function withDistributionAutolinking(config) {
  const channel =
    config.extra?.distributionChannel ??
    (process.env.APP_DISTRIBUTION === "playstore" ? "playstore" : "github");
  const isDev = Boolean(process.env.APP_VARIANT);

  if (channel === "playstore" || isDev) return config;

  const excluded = [
    "expo-in-app-updates",
    "expo-dev-client",
    "expo-dev-launcher",
    "expo-dev-menu",
    "expo-dev-menu-interface",
  ];

  return withSettingsGradle(config, (config) => {
    const marker = "expoAutolinking.useExpoModules()";
    const contents = config.modResults.contents;
    if (!contents.includes(excluded[0]) && contents.includes(marker)) {
      config.modResults.contents = contents.replace(
        marker,
        `expoAutolinking.exclude = ${JSON.stringify(excluded)}\n` + marker,
      );
    }
    return config;
  });
};
