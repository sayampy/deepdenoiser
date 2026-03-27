// Store this under plugins/with-onnxruntime.js!
const {
  withMainApplication,
  createRunOncePlugin,
} = require("expo/config-plugins");

const PACKAGE_IMPORT = "import ai.onnxruntime.reactnative.OnnxruntimePackage";

/**
 * Expo config plugin that manually registers OnnxruntimePackage in MainApplication.kt.
 *
 * onnxruntime-react-native uses the legacy ReactPackage pattern which isn't picked up
 * by Expo's autolinking. Without this, NativeModules.Onnxruntime is null at runtime.
 */
function withOnnxruntime(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Add import if missing
    if (!contents.includes(PACKAGE_IMPORT)) {
      const lastImportIndex = contents.lastIndexOf("\nimport ");
      if (lastImportIndex !== -1) {
        const endOfLine = contents.indexOf("\n", lastImportIndex + 1);
        contents =
          contents.slice(0, endOfLine + 1) +
          PACKAGE_IMPORT +
          "\n" +
          contents.slice(endOfLine + 1);
      }
    }

    // Add package registration if missing
    if (!contents.includes("OnnxruntimePackage()")) {
      // Insert after the comment line inside packages.apply { }
      const marker = "// add(MyReactNativePackage())";
      const markerIdx = contents.indexOf(marker);
      if (markerIdx !== -1) {
        const endOfMarkerLine = contents.indexOf("\n", markerIdx);
        contents =
          contents.slice(0, endOfMarkerLine) +
          "\n          add(OnnxruntimePackage())" +
          contents.slice(endOfMarkerLine);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withOnnxruntime,
  "withOnnxruntime",
  "1.0.0",
);
