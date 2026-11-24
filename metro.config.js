const path = require("path");
const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.assetExts.push("ort");

// Play In-App Updates (Play Core) is only useful in Play Store builds. Every
// other build updates by downloading the GitHub release APK and handing it to
// the system installer, so alias the module to a tiny stub at bundle time.
const isPlayStore =
  process.env.EXPO_PUBLIC_APP_DISTRIBUTION === "playstore" ||
  process.env.APP_DISTRIBUTION === "playstore";
const updatesModule = isPlayStore
  ? "expo-in-app-updates"
  : path.join(__dirname, "src/scripts/updates/inAppUpdatesStub.ts");
const originalResolveRequest = defaultConfig.resolver.resolveRequest;

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@app/in-app-updates") {
    const resolve = originalResolveRequest ?? context.resolveRequest;
    return resolve(context, updatesModule, platform);
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = defaultConfig;
