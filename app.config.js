const IS_DEV = process.env.APP_VARIANT;
module.exports = ({ config }) => {
  return {
    ...config,
    name: IS_DEV ? "DeepDenoiser (Dev)" : "DeepDenoiser",
    slug: "deepdenoiser",
    android: {
      ...config.android,
      package: IS_DEV
        ? "com.sayampy.deepdenoiser.dev"
        : "com.sayampy.deepdenoiser",
    },
  };
};
