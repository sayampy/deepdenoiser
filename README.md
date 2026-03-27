<p align="center">
<img src="./assets/images/android-icon-background.png" width=100/>
</p>

# DeepDenoiser
[![Version](https://img.shields.io/github/v/release/sayampy/deepdenoiser?label=version)](https://github.com/sayampy/deepdenoiser/releases)
[![License](https://img.shields.io/github/license/sayampy/deepdenoiser)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-green)](https://www.android.com/)
---
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/T6T61O5FRY)

**DeepDenoiser** is a powerful, open-source mobile application designed to remove background noise from your audio and video files instantly.

Powered by the state-of-the-art **DeepFilterNet3** model, it runs entirely on your device—ensuring your data remains private and your processing is lightning fast.

---

<p align="center" float="left">
  <img src="/fastlane/metadata/android/en-US/images/phoneScreenshots/1.png" width="33%" />
  <img src="/fastlane/metadata/android/en-US/images/phoneScreenshots/2.png" width="33%" />
</p>


https://github.com/user-attachments/assets/29f147db-ff8b-486a-877d-1d765922ed5c


---

## ✨ Features

- **🔇 Advanced Noise Suppression**: Eliminates background hiss, hums, and environmental noise using deep learning.
- **🎥 Audio & Video Support**: Process both voice recordings and video clips seamlessly.
- **🔒 Privacy First**: All processing happens locally on your device using ONNX Runtime. No data is ever uploaded to the cloud.
- **🚀 High Performance**: Built with custom Native Modules (Kotlin) for efficient media transcoding and I/O.
- **📱 Modern Design**: Clean, simple interface built with React Native & Expo.

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 54+)
- **AI Model**: DeepFilterNet3 (via `onnxruntime-react-native`)
- **Native Logic**: Custom Kotlin modules for Android `MediaCodec` handling
- **State Management**: React Hooks & Expo Router

## 🚀 Get Started

### Prerequisites

- Bun (Recommended)
- Android Development Environment (Android Studio)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/sayampy/deepdenoiser.git
   cd deepdenoiser
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Run on Android**
   _(Note: This project uses custom native code, so you must use a Development Build, not Expo Go)_
   ```bash
   bunx expo run:android
   ```

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
