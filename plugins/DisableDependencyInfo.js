const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function DisableDependencyInfo(config) {
  return withAppBuildGradle(config, async config => {
    const buildGradle = config.modResults.contents;
    
    // Inject the block into the android {} scope
    const patch = `
android {
    buildTypes {
        release {
            dependenciesInfo {
                includeInApk = false
                includeInBundle = false
            }
        }
    }
`;
    // Basic regex replacement to insert after 'android {'
    config.modResults.contents = buildGradle.replace(/android\s*\{/, patch);
    return config;
  });
};