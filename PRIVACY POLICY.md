# Privacy Policy for deepDenoiser

**Last Updated:** March 23, 2026

At **deepDenoiser**, privacy is not a feature; it is the default architectural state. This application is designed to process media locally using on-device AI inference.

## 1. Data Collection & Transmission
- **Zero Telemetry:** deepDenoiser does not collect, store, or transmit any personal data, usage statistics, or crash reports to external servers.
- **No Cloud Processing:** All audio and video denoising is performed locally on your device. Your media files are never uploaded to a server or third-party service.
- **Offline Functionality:** The application does not require an active internet connection to function.

## 2. AI Inference & ONNX Runtime
- **Local Execution:** deepDenoiser utilizes the ONNX Runtime for neural network inference. 
- **Hardware Acceleration:** Depending on your device, the app may utilize the CPU for processing. This computation remains entirely within the sandboxed environment of the application.

## 3. Permissions
The app requests the following permissions only when necessary for core functionality:
- **Storage/Media Access:** Required to read the source media files for denoising and to save the processed output to your device.
- **Microphone (Optional):** Not needed but required for an upcoming real-time denoising & recording feature.

## 4. Third-Party Dependencies
As an open-source project, deepDenoiser relies on several libraries (e.g., React Native, ONNX Runtime). These dependencies are audited for privacy compliance. No proprietary trackers (like Firebase or Facebook SDK) are included in the build.

## 5. Transparency & Open Source
The complete source code for deepDenoiser is available for public audit at: 
[https://github.com/sayampy/deepdenoiser](https://github.com/sayampy/deepdenoiser)

## 6. Contact
If you have questions regarding this policy or the technical implementation of privacy in this app, please open an issue on the GitHub repository.
