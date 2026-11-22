const IS_DEV = process.env.APP_VARIANT;
const DISTRIBUTION_CHANNEL = process.env.APP_DISTRIBUTION === "playstore"
  ? "playstore"
  : "github";
module.exports = ({ config }) => {
  return {
    ...config,
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
