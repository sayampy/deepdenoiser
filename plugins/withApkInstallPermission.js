const { withAndroidManifest } = require("@expo/config-plugins");

const INSTALL_PERMISSION = "android.permission.REQUEST_INSTALL_PACKAGES";

module.exports = function withApkInstallPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest["uses-permission"] ?? [];
    const isPlayStore = config.extra?.distributionChannel === "playstore";

    manifest["uses-permission"] = permissions.filter(
      (permission) => permission.$["android:name"] !== INSTALL_PERMISSION,
    );
    if (!isPlayStore) {
      manifest["uses-permission"].push({
        $: { "android:name": INSTALL_PERMISSION },
      });
    }

    return config;
  });
};
