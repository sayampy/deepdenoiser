const IS_DEV = Boolean(process.env.APP_VARIANT);
const DISTRIBUTION_CHANNEL = process.env.APP_DISTRIBUTION === "playstore"
  ? "playstore"
  : "github";

module.exports = ({ config }) => {
  // The development client is only useful for dev builds. Leaving it in
  // release builds links dev-menu/Hermes tooling native code into every
  // production APK/AAB for no benefit.
  const plugins = (config.plugins ?? []).filter(
    (plugin) => IS_DEV || !(typeof plugin === "string" && plugin === "expo-dev-client"),
  );

  // Play only needs 64-bit ARM. Keep x86_64 in dev builds so the repo's
  // emulator-based workflow keeps working, but don't ship it in releases.
  const buildPropertiesIndex = plugins.findIndex(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
  );
  if (buildPropertiesIndex >= 0) {
    const [name, options] = plugins[buildPropertiesIndex];
    plugins[buildPropertiesIndex] = [
      name,
      {
        ...options,
        android: {
          ...options.android,
          buildArchs: IS_DEV ? ["arm64-v8a", "x86_64"] : ["arm64-v8a"],
        },
      },
    ];
  }

  return {
    ...config,
    plugins,
    name: IS_DEV ? "DeepDenoiser (Dev)" : "DeepDenoiser",
    slug: "deepdenoiser",
    version: "1.5.0",
    android: {
      ...config.android,
      package: IS_DEV
        ? "com.sayampy.deepdenoiser.dev"
        : "com.sayampy.deepdenoiser",
    },
    extra: {
      ...config.extra,
      distributionChannel: DISTRIBUTION_CHANNEL,
    },
  };
};
