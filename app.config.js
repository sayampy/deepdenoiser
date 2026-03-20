const IS_DEV = process.env.APP_VARIANT;
export default {
  name: IS_DEV ? "DeepDenoiser (Dev)" : "DeepDenoiser",
  slug: "deepdenoiser",
  android: {
    package: IS_DEV
      ? "com.sayampy.deepdenoiser.dev"
      : "com.sayampy.deepdenoiser",
  },
};
