const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Sets android:largeHeap="true" on the <application> element.
 *
 * onnxruntime-react-native + the frame-by-frame Tensor churn can exhaust the
 * default 256MB Java heap on low-end devices (users reported
 * java.lang.OutOfMemoryError on the UI thread after recording/denoising).
 * largeHeap raises the ceiling to ~512MB — a safety net on top of the
 * allocation/leak fixes (session singleton, tensor reuse, bounded queues).
 */
module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$["android:largeHeap"] = "true";
    }
    return config;
  });
};
