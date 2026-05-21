This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.expo-shared/
  assets.json
  README.md
.github/
  workflows/
    android.yml
  FUNDING.yml
assets/
  images/
    android-icon-background.png
    android-icon-foreground.png
    android-icon-monochrome.png
    favicon.png
    heart_india.png
    icon.png
    splash-icon.png
    splash.png
    support_me_on_kofi.png
    upi-logo.png
  model/
    denoiser_model.ort
    model_metadata.json
modules/
  AudioProcessorModule/
    _ios/
      AudioProcessorModule.podspec
      AudioProcessorModule.swift
      AudioProcessorModuleView.swift
    android/
      build/
        generated/
          source/
            buildConfig/
              debug/
                expo/
                  modules/
                    audioprocessormodule/
                      BuildConfig.java
        intermediates/
          aapt_friendly_merged_manifests/
            debug/
              processDebugManifest/
                aapt/
                  AndroidManifest.xml
                  output-metadata.json
          aar_metadata/
            debug/
              writeDebugAarMetadata/
                aar-metadata.properties
          annotation_processor_list/
            debug/
              javaPreCompileDebug/
                annotationProcessors.json
          compile_r_class_jar/
            debug/
              generateDebugRFile/
                R.jar
          compile_symbol_list/
            debug/
              generateDebugRFile/
                R.txt
          incremental/
            debug/
              packageDebugResources/
                compile-file-map.properties
                merger.xml
          local_only_symbol_list/
            debug/
              parseDebugLocalResources/
                R-def.txt
          manifest_merge_blame_file/
            debug/
              processDebugManifest/
                manifest-merger-blame-debug-report.txt
          merged_manifest/
            debug/
              processDebugManifest/
                AndroidManifest.xml
          navigation_json/
            debug/
              extractDeepLinksDebug/
                navigation.json
          nested_resources_validation_report/
            debug/
              generateDebugResources/
                nestedResourcesValidationReport.txt
          symbol_list_with_package_name/
            debug/
              generateDebugRFile/
                package-aware-r.txt
        kotlin/
          compileDebugKotlin/
            cacheable/
              dirty-sources.txt
            local-state/
              build-history.bin
        outputs/
          logs/
            manifest-merger-debug-report.txt
      src/
        main/
          java/
            expo/
              modules/
                audioprocessormodule/
                  AudioProcessor.kt
                  AudioProcessorModule.kt
          AndroidManifest.xml
      build.gradle
    src/
      AudioProcessorModule.ts
      AudioProcessorModule.types.ts
    expo-module.config.json
    index.ts
patches/
  expo-modules-core+55.0.17.patch
  expo-modules-core+55.0.18.patch
  onnxruntime-react-native+1.24.3.patch
  patch-ort.js
plugins/
  DisableDependencyInfo.js
  withFlexiblePgSize.js
  withNdkVersion.js
  withOnnxruntime.js
src/
  app/
    (tabs)/
      about/
        _layout.tsx
        index.tsx
        licenses.tsx
      _layout.tsx
      index.tsx
    processing/
      _layout.tsx
      process.tsx
    recording/
      index.tsx
    _layout.tsx
    +native-intent.ts
    share-handler.tsx
  components/
    advanceSettings.tsx
    audioPlayer.tsx
    customSlider.tsx
    DonationModal.tsx
    ErrorModal.tsx
    InfoBubble.tsx
    SettingsSidebar.tsx
    shareBtn.tsx
    UpdateModal.tsx
    videoPlayer.tsx
  constants/
    theme.ts
  scripts/
    analytics.ts
    AudioProcess.ts
    Denoiser.ts
    formatHandler.ts
    settings.ts
.gitignore
.ignore
app.config.js
app.json
CONTRIBUTING.md
eas.json
eslint.config.js
metro.config.js
package.json
PRIVACY POLICY.md
react-native.config.js
README.md
TODO.md
tsconfig.json
```

# Files

## File: .expo-shared/assets.json
````json
{}
````

## File: .expo-shared/README.md
````markdown
> Why do I have a folder named ".expo-shared" in my project?

The ".expo-shared" folder is created when running commands that produce state that is intended to be shared with all developers on the project. For example, "npx expo-optimize".

> What does the "assets.json" file contain?

The "assets.json" file describes the assets that have been optimized through "expo-optimize" and do not need to be processed again.

> Should I commit the ".expo-shared" folder?

Yes, you should share the ".expo-shared" folder with your collaborators.
````

## File: assets/model/model_metadata.json
````json
{
    "inputs": [
        {
            "name": "input_frame",
            "shape": [
                512
            ],
            "type": "tensor(float)"
        },
        {
            "name": "erb_norm_state",
            "shape": [
                32
            ],
            "type": "tensor(float)"
        },
        {
            "name": "band_unit_norm_state",
            "shape": [
                1,
                96,
                1
            ],
            "type": "tensor(float)"
        },
        {
            "name": "analysis_mem",
            "shape": [
                512
            ],
            "type": "tensor(float)"
        },
        {
            "name": "synthesis_mem",
            "shape": [
                512
            ],
            "type": "tensor(float)"
        },
        {
            "name": "rolling_erb_buf",
            "shape": [
                1,
                1,
                3,
                32
            ],
            "type": "tensor(float)"
        },
        {
            "name": "rolling_feat_spec_buf",
            "shape": [
                1,
                2,
                3,
                96
            ],
            "type": "tensor(float)"
        },
        {
            "name": "rolling_c0_buf",
            "shape": [
                1,
                64,
                5,
                96
            ],
            "type": "tensor(float)"
        },
        {
            "name": "rolling_spec_buf_x",
            "shape": [
                5,
                513,
                2
            ],
            "type": "tensor(float)"
        },
        {
            "name": "rolling_spec_buf_y",
            "shape": [
                7,
                513,
                2
            ],
            "type": "tensor(float)"
        },
        {
            "name": "enc_hidden",
            "shape": [
                1,
                1,
                256
            ],
            "type": "tensor(float)"
        },
        {
            "name": "erb_dec_hidden",
            "shape": [
                2,
                1,
                256
            ],
            "type": "tensor(float)"
        },
        {
            "name": "df_dec_hidden",
            "shape": [
                2,
                1,
                256
            ],
            "type": "tensor(float)"
        }
    ],
    "outputs": [
        {
            "name": "enhanced_audio_frame",
            "shape": [
                512
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_erb_norm_state",
            "shape": [
                32
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_band_unit_norm_state",
            "shape": [
                1,
                96,
                1
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_analysis_mem",
            "shape": [
                512
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_synthesis_mem",
            "shape": [
                512
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_rolling_erb_buf",
            "shape": [
                1,
                1,
                3,
                32
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_rolling_feat_spec_buf",
            "shape": [
                1,
                2,
                3,
                96
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_rolling_c0_buf",
            "shape": [
                1,
                64,
                5,
                96
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_rolling_spec_buf_x",
            "shape": [
                5,
                513,
                2
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_rolling_spec_buf_y",
            "shape": [
                7,
                513,
                2
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_enc_hidden",
            "shape": [
                1,
                1,
                256
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_erb_dec_hidden",
            "shape": [
                2,
                1,
                256
            ],
            "type": "tensor(float)"
        },
        {
            "name": "new_df_dec_hidden",
            "shape": [
                2,
                1,
                256
            ],
            "type": "tensor(float)"
        }
    ],
    "hop_size": 512,
    "fft_size": 960,
    "frame_size": 512,
    "state_input_names": [
        "erb_norm_state",
        "band_unit_norm_state",
        "analysis_mem",
        "synthesis_mem",
        "rolling_erb_buf",
        "rolling_feat_spec_buf",
        "rolling_c0_buf",
        "rolling_spec_buf_x",
        "rolling_spec_buf_y",
        "enc_hidden",
        "erb_dec_hidden",
        "df_dec_hidden"
    ]
}
````

## File: modules/AudioProcessorModule/_ios/AudioProcessorModule.podspec
````
Pod::Spec.new do |s|
  s.name           = 'AudioProcessorModule'
  s.version        = '1.0.0'
  s.summary        = 'A sample project summary'
  s.description    = 'A sample project description'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
````

## File: modules/AudioProcessorModule/_ios/AudioProcessorModule.swift
````swift
public class AudioProcessorModule: Module {
// Each module class must implement the definition function. The definition consists of components
// that describes the module's functionality and behavior.
// See https://docs.expo.dev/modules/module-api for more details about available components.
public func definition() -> ModuleDefinition {
// Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
// Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
// The module will be accessible from `requireNativeModule('AudioProcessorModule')` in JavaScript.
⋮----
// Enables the module to be used as a native view. Definition components that are accepted as part of the
// view definition: Prop, Events.
⋮----
// Defines a setter for the `url` prop.
````

## File: modules/AudioProcessorModule/_ios/AudioProcessorModuleView.swift
````swift
// This view will be used as a native component. Make sure to inherit from `ExpoView`
// to apply the proper styling (e.g. border radius and shadows).
class AudioProcessorModuleView: ExpoView {
let webView = WKWebView()
let onLoad = EventDispatcher()
var delegate: WebViewDelegate?
⋮----
required init(appContext: AppContext? = nil) {
⋮----
override func layoutSubviews() {
⋮----
class WebViewDelegate: NSObject, WKNavigationDelegate {
let onUrlChange: (String) -> Void
⋮----
init(onUrlChange: @escaping (String) -> Void) {
⋮----
func webView(_ webView: WKWebView, didFinish navigation: WKNavigation) {
````

## File: modules/AudioProcessorModule/android/build/generated/source/buildConfig/debug/expo/modules/audioprocessormodule/BuildConfig.java
````java
/**
 * Automatically generated file. DO NOT MODIFY
 */
⋮----
public final class BuildConfig {
public static final boolean DEBUG = Boolean.parseBoolean("true");
````

## File: modules/AudioProcessorModule/android/build/intermediates/aapt_friendly_merged_manifests/debug/processDebugManifest/aapt/AndroidManifest.xml
````xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="expo.modules.audioprocessormodule" >

    <uses-sdk android:minSdkVersion="24" />

</manifest>
````

## File: modules/AudioProcessorModule/android/build/intermediates/aapt_friendly_merged_manifests/debug/processDebugManifest/aapt/output-metadata.json
````json
{
  "version": 3,
  "artifactType": {
    "type": "AAPT_FRIENDLY_MERGED_MANIFESTS",
    "kind": "Directory"
  },
  "applicationId": "expo.modules.audioprocessormodule",
  "variantName": "debug",
  "elements": [
    {
      "type": "SINGLE",
      "filters": [],
      "attributes": [],
      "outputFile": "AndroidManifest.xml"
    }
  ],
  "elementType": "File"
}
````

## File: modules/AudioProcessorModule/android/build/intermediates/aar_metadata/debug/writeDebugAarMetadata/aar-metadata.properties
````
aarFormatVersion=1.0
aarMetadataVersion=1.0
minCompileSdk=1
minCompileSdkExtension=0
minAndroidGradlePluginVersion=1.0.0
coreLibraryDesugaringEnabled=false
````

## File: modules/AudioProcessorModule/android/build/intermediates/annotation_processor_list/debug/javaPreCompileDebug/annotationProcessors.json
````json
{}
````

## File: modules/AudioProcessorModule/android/build/intermediates/compile_symbol_list/debug/generateDebugRFile/R.txt
````

````

## File: modules/AudioProcessorModule/android/build/intermediates/incremental/debug/packageDebugResources/compile-file-map.properties
````
#Sat Mar 14 00:15:38 IST 2026
````

## File: modules/AudioProcessorModule/android/build/intermediates/incremental/debug/packageDebugResources/merger.xml
````xml
<?xml version="1.0" encoding="utf-8"?>
<merger version="3"><dataSet aapt-namespace="http://schemas.android.com/apk/res-auto" config="main$Generated" generated="true" ignore_pattern="!.svn:!.git:!.ds_store:!*.scc:.*:&lt;dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"><source path="/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/res"/></dataSet><dataSet aapt-namespace="http://schemas.android.com/apk/res-auto" config="main" generated-set="main$Generated" ignore_pattern="!.svn:!.git:!.ds_store:!*.scc:.*:&lt;dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"><source path="/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/res"/></dataSet><dataSet aapt-namespace="http://schemas.android.com/apk/res-auto" config="debug$Generated" generated="true" ignore_pattern="!.svn:!.git:!.ds_store:!*.scc:.*:&lt;dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"><source path="/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/debug/res"/></dataSet><dataSet aapt-namespace="http://schemas.android.com/apk/res-auto" config="debug" generated-set="debug$Generated" ignore_pattern="!.svn:!.git:!.ds_store:!*.scc:.*:&lt;dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"><source path="/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/debug/res"/></dataSet><dataSet aapt-namespace="http://schemas.android.com/apk/res-auto" config="generated$Generated" generated="true" ignore_pattern="!.svn:!.git:!.ds_store:!*.scc:.*:&lt;dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"><source path="/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/build/generated/res/resValues/debug"/></dataSet><dataSet aapt-namespace="http://schemas.android.com/apk/res-auto" config="generated" generated-set="generated$Generated" ignore_pattern="!.svn:!.git:!.ds_store:!*.scc:.*:&lt;dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"><source path="/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/build/generated/res/resValues/debug"/></dataSet><mergedItems/></merger>
````

## File: modules/AudioProcessorModule/android/build/intermediates/local_only_symbol_list/debug/parseDebugLocalResources/R-def.txt
````
R_DEF: Internal format may change without notice
local
````

## File: modules/AudioProcessorModule/android/build/intermediates/manifest_merge_blame_file/debug/processDebugManifest/manifest-merger-blame-debug-report.txt
````
1<?xml version="1.0" encoding="utf-8"?>
2<manifest xmlns:android="http://schemas.android.com/apk/res/android"
3    package="expo.modules.audioprocessormodule" >
4
5    <uses-sdk android:minSdkVersion="24" />
6
7</manifest>
````

## File: modules/AudioProcessorModule/android/build/intermediates/merged_manifest/debug/processDebugManifest/AndroidManifest.xml
````xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="expo.modules.audioprocessormodule" >

    <uses-sdk android:minSdkVersion="24" />

</manifest>
````

## File: modules/AudioProcessorModule/android/build/intermediates/navigation_json/debug/extractDeepLinksDebug/navigation.json
````json
[]
````

## File: modules/AudioProcessorModule/android/build/intermediates/nested_resources_validation_report/debug/generateDebugResources/nestedResourcesValidationReport.txt
````
0 Warning/Error
````

## File: modules/AudioProcessorModule/android/build/intermediates/symbol_list_with_package_name/debug/generateDebugRFile/package-aware-r.txt
````
expo.modules.audioprocessormodule
````

## File: modules/AudioProcessorModule/android/build/kotlin/compileDebugKotlin/cacheable/dirty-sources.txt
````
/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/java/expo/modules/audioprocessormodule/AudioProcessor.kt
/home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/java/expo/modules/audioprocessormodule/AudioProcessorModule.kt
````

## File: modules/AudioProcessorModule/android/build/outputs/logs/manifest-merger-debug-report.txt
````
-- Merging decision tree log ---
manifest
ADDED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml:1:1-2:12
INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml:1:1-2:12
	package
		INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml
uses-sdk
INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml reason: use-sdk injection requested
INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml
INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml
	android:targetSdkVersion
		INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml
	android:minSdkVersion
		INJECTED from /home/sayam/Projects/deepdenoiser/modules/AudioProcessorModule/android/src/main/AndroidManifest.xml
````

## File: modules/AudioProcessorModule/android/src/main/AndroidManifest.xml
````xml
<manifest>
</manifest>
````

## File: modules/AudioProcessorModule/src/AudioProcessorModule.types.ts
````typescript
import type { StyleProp, ViewStyle } from 'react-native';
⋮----
export type OnLoadEventPayload = {
  url: string;
};
⋮----
export type AudioProcessorModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};
⋮----
export type ChangeEventPayload = {
  value: string;
};
⋮----
export type AudioProcessorModuleViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
````

## File: modules/AudioProcessorModule/expo-module.config.json
````json
{
  "platforms": ["apple", "android", "web"],
  "apple": {
    "modules": ["AudioProcessorModule"]
  },
  "android": {
    "modules": ["expo.modules.audioprocessormodule.AudioProcessorModule"]
  }
}
````

## File: src/app/processing/_layout.tsx
````typescript
import { Stack } from "expo-router";
import React from "react";
⋮----
export default function ProcessLayout()
````

## File: src/constants/theme.ts
````typescript
import { Platform, StyleSheet } from "react-native";
⋮----
primary: "#00E5FF", // Vibrant Cyan
secondary: "#1E293B", // Deep Slate
accent: "#F59E0B", // Amber
background: "#0F172A", // Dark Navy
surface: "#1E293B", // Lighter Navy for cards
text: "#F8FAFC", // Off White
subtext: "#94A3B8", // Slate Blue/Gray
⋮----
error: "#EF4444", // Bright Red
success: "#10B981", // Emerald Green
````

## File: .ignore
````
LICENSE
licenses.json
fastlane/
*.svg
````

## File: CONTRIBUTING.md
````markdown
## how to run the project:

```sh
bun install
bunx expo prebuild
```

Run: `bunx expo start`
````

## File: eslint.config.js
````javascript
// https://docs.expo.dev/guides/using-eslint/
````

## File: metro.config.js
````javascript

````

## File: react-native.config.js
````javascript

````

## File: tsconfig.json
````json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
````

## File: modules/AudioProcessorModule/android/src/main/java/expo/modules/audioprocessormodule/AudioProcessorModule.kt
````kotlin
package expo.modules.audioprocessormodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AudioProcessorModule : Module() {
    // Dedicate a scope to prevent stalling the main thread during heavy I/O
    private val moduleScope = CoroutineScope(Dispatchers.Default)

    override fun definition() = ModuleDefinition {
        Name("AudioProcessorModule")

        AsyncFunction("extractAndTranscodeAudio") {
                input: String,
                output: String,
                bitrate: Int?,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result = processor.transcodeAudio(input, output, bitrate)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_TRANSCODE", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("decodeToPCM") {
                input: String,
                output: String,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result = processor.decodeToPCM(input, output)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_DECODE", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("pcmToWav") {
                pcmInput: String,
                wavOutput: String,
                sampleRate: Int,
                channels: Int,
                bitDepth: Int,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result =
                            processor.pcmToWav(pcmInput, wavOutput, sampleRate, channels, bitDepth)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_WAV_CONV", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("mixAudioVideo") {
                videoPath: String,
                audioPath: String,
                outputPath: String,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result = processor.muxAudioVideo(videoPath, audioPath, outputPath)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_MUX_AUDIO_VIDEO", e.message ?: e.toString(), e)
                }
            }
        }
    }
}
````

## File: modules/AudioProcessorModule/android/build.gradle
````
apply plugin: 'com.android.library'

group = 'expo.modules.audioprocessormodule'
version = '0.7.6'

def expoModulesCorePlugin = new File(project(":expo-modules-core").projectDir.absolutePath, "ExpoModulesCorePlugin.gradle")
apply from: expoModulesCorePlugin
applyKotlinExpoModulesCorePlugin()
useCoreDependencies()
useExpoPublishing()

// If you want to use the managed Android SDK versions from expo-modules-core, set this to true.
// The Android SDK versions will be bumped from time to time in SDK releases and may introduce breaking changes in your module code.
// Most of the time, you may like to manage the Android SDK versions yourself.
def useManagedAndroidSdkVersions = false
if (useManagedAndroidSdkVersions) {
  useDefaultAndroidSdkVersions()
} else {
  buildscript {
    // Simple helper that allows the root project to override versions declared by this library.
    ext.safeExtGet = { prop, fallback ->
      rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
    }
  }
  project.android {
    compileSdkVersion safeExtGet("compileSdkVersion", 36)
    defaultConfig {
      minSdkVersion safeExtGet("minSdkVersion", 24)
      targetSdkVersion safeExtGet("targetSdkVersion", 36)
    }
  }
}
dependencies {
  implementation 'com.linkedin.android.litr:litr:1.5.7'
  implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.3.9"
}
android {
  namespace "expo.modules.audioprocessormodule"
  defaultConfig {
    versionCode 1
    versionName "0.7.6"
  }
  lintOptions {
    abortOnError false
  }
}
````

## File: modules/AudioProcessorModule/src/AudioProcessorModule.ts
````typescript
import { NativeModule, requireNativeModule } from "expo";
⋮----
import { AudioProcessorModuleEvents } from "./AudioProcessorModule.types";
⋮----
declare class AudioProcessorModule extends NativeModule<AudioProcessorModuleEvents>
⋮----
extractAndTranscodeAudio(
    inputUri: string,
    outputUri: string,
    bitrate?: number,
  ): Promise<string>;
decodeToPCM(
    inputUri: string,
    outputUri: string,
): Promise<
pcmToWav(
    pcmUri: string,
    wavUri: string,
    sampleRate: number,
    channels: number,
    bitDepth: number,
  ): Promise<string>;
mixAudioVideo(
    videoUri: string,
    audioUri: string,
    outputUri: string,
  ): Promise<string>;
⋮----
// This call loads the native module object from the JSI.
````

## File: modules/AudioProcessorModule/index.ts
````typescript
// Reexport the native module. On web, it will be resolved to AudioProcessorModule.web.ts
// and on native platforms to AudioProcessorModule.ts
// export { default } from "./src/AudioProcessorModule";
import AudioProcessorModule from "./src/AudioProcessorModule";
⋮----
export async function extractAndTranscodeAudio(
  inputUri: string,
  outputUri: string,
  bitrate?: number,
): Promise<string>
⋮----
export async function mixAudioVideo(
  videoUri: string,
  audioUri: string,
  outputUri: string,
): Promise<string>
⋮----
export async function decodeToPCM(
  inputUri: string,
  outputUri: string,
): Promise<
⋮----
export async function pcmToWav(
  pcmUri: string,
  wavUri: string,
  sampleRate: number = 48000,
  channels: number = 1,
  bitDepth: number = 16,
): Promise<string>
````

## File: patches/expo-modules-core+55.0.17.patch
````diff
diff --git a/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle b/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
index 7910c77..298040c 100644
--- a/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
+++ b/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
@@ -96,7 +96,7 @@ ext.useExpoPublishing = {
     publishing {
       publications {
         release(MavenPublication) {
-          from components.release
+          if (components.findByName("release") != null) { from components.release }
         }
       }
       repositories {
````

## File: patches/expo-modules-core+55.0.18.patch
````diff
diff --git a/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle b/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
index 7910c77..298040c 100644
--- a/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
+++ b/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
@@ -96,7 +96,7 @@ ext.useExpoPublishing = {
     publishing {
       publications {
         release(MavenPublication) {
-          from components.release
+          if (components.findByName("release") != null) { from components.release }
         }
       }
       repositories {
````

## File: plugins/DisableDependencyInfo.js
````javascript
// Inject the block into the android {} scope
⋮----
// Basic regex replacement to insert after 'android {'
````

## File: plugins/withNdkVersion.js
````javascript

````

## File: plugins/withOnnxruntime.js
````javascript
// Store this under plugins/with-onnxruntime.js!
⋮----
/**
 * Expo config plugin that manually registers OnnxruntimePackage in MainApplication.kt.
 *
 * onnxruntime-react-native uses the legacy ReactPackage pattern which isn't picked up
 * by Expo's autolinking. Without this, NativeModules.Onnxruntime is null at runtime.
 */
function withOnnxruntime(config)
⋮----
// Add import if missing
⋮----
// Add package registration if missing
⋮----
// Insert after the comment line inside packages.apply { }
````

## File: src/app/(tabs)/about/_layout.tsx
````typescript
import { Stack } from "expo-router";
import React from "react";
⋮----
export default function AboutLayout()
````

## File: src/app/(tabs)/about/licenses.tsx
````typescript
import licensesData from "@/assets/generated/licenses.json";
⋮----
import { Feather } from "@expo/vector-icons";
⋮----
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
⋮----
interface LicenseInfo {
  licenses: string;
  repository?: string;
  licenseUrl?: string;
  parents?: string;
}
⋮----
const openLink = (url?: string) =>
⋮----
onPress=
⋮----
<TouchableOpacity onPress=
````

## File: src/app/(tabs)/_layout.tsx
````typescript
import { COLORS } from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
````

## File: src/components/customSlider.tsx
````typescript
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import InfoBubble from "./InfoBubble";
⋮----
export interface CustomSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  steps?: number[];
  unit?: string;
  info?: string;
  decimalPlaces?: number;
}
⋮----
// Update progress if value changes from outside (e.g. initial load)
⋮----
const getInitialProgress = () =>
````

## File: src/components/InfoBubble.tsx
````typescript
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
⋮----
interface InfoBubbleProps {
  text: string;
  children: React.ReactNode;
}
⋮----
const showBubble = () =>
⋮----
const hideBubble = () =>
⋮----
const onBubbleLayout = (event: LayoutChangeEvent) =>
⋮----
// Calculate bubble position
// 12 is the arrow size/2 + offset
⋮----
// Boundary checks to keep bubble on screen
⋮----
// Arrow alignment
⋮----
bottom: -6.5, // Slightly offset to overlap with border
````

## File: patches/patch-ort.js
````javascript
// This script is located in the 'android' directory.
// node_modules is likely in the project root (one level up).
⋮----
function patchBuildGradle()
⋮----
// Find arguments in externalNativeBuild { cmake { ... } }
// Attempt to insert into arguments list or string
⋮----
function patchCMakeLists()
⋮----
// Append to the end of the file or after target_link_libraries if exists
````

## File: plugins/withFlexiblePgSize.js
````javascript
/**
 * Expo config plugin to enable 16KB page alignment for locally compiled native libraries.
 * 
 * Specifically targets libonnxruntime-jsi.so which is compiled from source in 
 * onnxruntime-react-native's Android build.
 */
⋮----
// Use regex to find cmake arguments blocks and append the flag.
// It looks for arguments followed by a list of strings, and inserts before the last string's closing quote
// or just appends to the list if it matches the known structure.
⋮----
// Fallback to literal search if regex fails
⋮----
// Reset regex index for replaceAll
⋮----
// Append the flag to the arguments list
````

## File: src/components/DonationModal.tsx
````typescript
import { Feather } from "@expo/vector-icons";
⋮----
import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
⋮----
interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}
⋮----
const openLink = (url: string) =>
⋮----
source=
````

## File: src/components/ErrorModal.tsx
````typescript
import { Feather } from "@expo/vector-icons";
⋮----
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
⋮----
interface ErrorModalProps {
  visible: boolean;
  error: Error | null;
  onClose: () => void;
}
⋮----
const interpretError = (err: Error) =>
⋮----
const copyToClipboard = async () =>
⋮----
const submitToGithub = () =>
````

## File: src/components/SettingsSidebar.tsx
````typescript
import Aptabase from "@aptabase/react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppSettings, getSettings, updateSettings } from "../scripts/settings";
⋮----
interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
}
⋮----
export default function SettingsSidebar(
⋮----
const loadSettings = async () =>
⋮----
const handleToggle = async (key: keyof AppSettings, value: boolean) =>
````

## File: src/scripts/analytics.ts
````typescript
import { init, trackEvent } from "@aptabase/react-native";
import { getSettings } from "./settings";
⋮----
// Note: Replace with actual Aptabase App Key
⋮----
export const initAnalytics = async () =>
⋮----
export const trackAppEvent = async (name: string, props?: Record<string, any>) =>
⋮----
export const trackAppError = async (error: Error, info?: any) =>
````

## File: src/scripts/settings.ts
````typescript
import { File, Paths } from "expo-file-system";
⋮----
export interface AppSettings {
  analytics: boolean;
  crashlytics: boolean;
  checkForUpdates: boolean;
}
⋮----
export async function getSettings(): Promise<AppSettings>
⋮----
export async function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings>
````

## File: PRIVACY POLICY.md
````markdown
**Privacy Policy**

Sayam Goswami built the DeepDenoiser app as a Free app. This SERVICE is provided by Sayam Goswami at no cost and is intended for use as is.

This page is used to inform visitors regarding my policies with the collection, use, and disclosure of Personal Information if anyone decided to use my Service.

If you choose to use my Service, then you agree to the collection and use of information in relation to this policy. The Personal Information that I collect is used for providing and improving the Service. I will not use or share your information with anyone except as described in this Privacy Policy.

The terms used in this Privacy Policy have the same meanings as in our Terms and Conditions, which are accessible at DeepDenoiser unless otherwise defined in this Privacy Policy.

**Information Collection and Use**

For a better experience, while using our Service, I may require you to provide us with certain personally identifiable information. The information that I request will be retained on your device and is not collected by me in any way.

The app does use third-party services that may collect information used to identify you.

Link to the privacy policy of third-party service providers used by the app

*   [Google Play Services](https://www.google.com/policies/privacy/)

**Log Data**

I want to inform you that whenever you use my Service, in a case of an error in the app I collect data and information (through third-party products) on your phone called Log Data. This Log Data may include information such as your device Internet Protocol (“IP”) address, device name, operating system version, the configuration of the app when utilizing my Service, the time and date of your use of the Service, and other statistics.

**Cookies**

Cookies are files with a small amount of data that are commonly used as anonymous unique identifiers. These are sent to your browser from the websites that you visit and are stored on your device's internal memory.

This Service does not use these “cookies” explicitly. However, the app may use third-party code and libraries that use “cookies” to collect information and improve their services. You have the option to either accept or refuse these cookies and know when a cookie is being sent to your device. If you choose to refuse our cookies, you may not be able to use some portions of this Service.

**Service Providers**

I may employ third-party companies and individuals due to the following reasons:

*   To facilitate our Service;
*   To provide the Service on our behalf;
*   To perform Service-related services; or
*   To assist us in analyzing how our Service is used.

I want to inform users of this Service that these third parties have access to their Personal Information. The reason is to perform the tasks assigned to them on our behalf. However, they are obligated not to disclose or use the information for any other purpose.

**Security**

I value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and I cannot guarantee its absolute security.

**Links to Other Sites**

This Service may contain links to other sites. If you click on a third-party link, you will be directed to that site. Note that these external sites are not operated by me. Therefore, I strongly advise you to review the Privacy Policy of these websites. I have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.

**Children’s Privacy**

These Services do not address anyone under the age of 13. I do not knowingly collect personally identifiable information from children under 13 years of age. In the case I discover that a child under 13 has provided me with personal information, I immediately delete this from our servers. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact me so that I will be able to do the necessary actions.

**Changes to This Privacy Policy**

I may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes. I will notify you of any changes by posting the new Privacy Policy on this page.

This policy is effective as of 2026-04-07

**Contact Us**

If you have any questions or suggestions about my Privacy Policy, do not hesitate to contact me at sayampy.code@gmail.com.

This privacy policy page was created at [privacypolicytemplate.net](https://privacypolicytemplate.net) and modified/generated by [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/)
````

## File: .github/FUNDING.yml
````yaml
# These are supported funding model platforms

github: 'sayampy'
ko_fi: 'sayampy'
````

## File: src/app/(tabs)/about/index.tsx
````typescript
import { Feather } from "@expo/vector-icons";
⋮----
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
⋮----
import DonationModal from "@/src/components/DonationModal";
import SettingsSidebar from "@/src/components/SettingsSidebar";
import Constants from "expo-constants";
⋮----
const openLink = (url: string) =>
⋮----
// marginTop: 5,
````

## File: src/scripts/AudioProcess.ts
````typescript
/**
 * @param audio The input audio as a Float32Array.
 * @param targetRmsDb The target RMS level in decibels (default is -14.0 dB, common for mobile/web).
 * @param maxPeakDb The maximum peak level allowed in decibels (default is -1.0 dB).
 * @returns A new Float32Array with normalized audio.
 */
export function normalizeAudio(
  audio: Float32Array,
  targetRmsDb: number = -14.0,
  maxPeakDb: number = -1.0
): Float32Array
⋮----
// Convert dB targets to linear scale
⋮----
// Pass 1: Calculate current RMS and Peak
⋮----
// If silent or extremely quiet, return as is
⋮----
// Calculate required gain for target RMS
⋮----
// Check if this gain would cause clipping above maxPeak
⋮----
// If it would clip, prioritize peak-based normalization
⋮----
// Pass 2: Apply dynamic gain adjustment using a sliding window.
// This adjusts gain for quiet and loud parts while preventing clipping.
// We perform this IN-PLACE to save memory.
const blockSize = 2048; // ~42ms at 48kHz
⋮----
// Limit boost to 4x the global normalization gain to prevent noise floor amplification
````

## File: app.config.js
````javascript
module.exports = (
````

## File: patches/onnxruntime-react-native+1.24.3.patch
````diff
diff --git a/node_modules/onnxruntime-react-native/android/CMakeLists.txt b/node_modules/onnxruntime-react-native/android/CMakeLists.txt
index 2f814e8..191ae18 100644
--- a/node_modules/onnxruntime-react-native/android/CMakeLists.txt
+++ b/node_modules/onnxruntime-react-native/android/CMakeLists.txt
@@ -97,3 +97,9 @@ target_link_libraries(
   ${log-lib} # <-- Logcat logger
   android # <-- Android JNI core
 )
+
+target_link_options(
+  onnxruntimejsi PRIVATE
+  "-Wl,-z,max-page-size=16384"
+  "-Wl,-z,common-page-size=16384"
+)
diff --git a/node_modules/onnxruntime-react-native/android/build.gradle b/node_modules/onnxruntime-react-native/android/build.gradle
index 41b4359..031ebe4 100644
--- a/node_modules/onnxruntime-react-native/android/build.gradle
+++ b/node_modules/onnxruntime-react-native/android/build.gradle
@@ -85,6 +85,7 @@ android {
         if (REACT_NATIVE_MINOR_VERSION >= 71) {
           // fabricjni required c++_shared
           arguments "-DANDROID_STL=c++_shared",
+            "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON",
             "-DNODE_MODULES_DIR=${nodeModules}",
             "-DORT_EXTENSIONS_ENABLED=${ortExtensionsEnabled}",
             "-DREACT_NATIVE_VERSION=${REACT_NATIVE_VERSION}",
@@ -247,7 +248,7 @@ dependencies {
     extractLibs "com.microsoft.onnxruntime:onnxruntime-android:latest.integration@aar"
   }
 
-  if (VersionNumber.parse(REACT_NATIVE_VERSION) < VersionNumber.parse("0.71")) {
+  if (REACT_NATIVE_VERSION.split("\\.")[0].toInteger() == 0 && REACT_NATIVE_VERSION.split("\\.")[1].toInteger() < 71) {
     extractLibs "com.facebook.fbjni:fbjni:+:headers"
     extractLibs "com.facebook.fbjni:fbjni:+"
   }
````

## File: src/app/+native-intent.ts
````typescript
export function redirectSystemPath({
    path,
    initial,
}: {
    path: string;
    initial: boolean;
})
⋮----
// Check if the incoming path is from expo-sharing
// This can be via a custom scheme like expo-sharing:// or a deep link
⋮----
// Default path handling
⋮----
// If everything fails, fallback to home
````

## File: src/components/advanceSettings.tsx
````typescript
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomSlider from "./customSlider";
import InfoBubble from "./InfoBubble";
⋮----
interface AdvanceSettingsProps {
  attenLimDb: number;
  onAttenLimDbChange: (value: number) => void;
  normalize: {
    toggle: boolean;
    targetRMS: number;
    maxPeakDb: number;
  };
  onNormalizeChange: (value: any) => void;
}
⋮----
export default function AdvanceSettings({
  attenLimDb,
  onAttenLimDbChange,
  normalize,
  onNormalizeChange,
}: AdvanceSettingsProps)
⋮----
const handleToggleNormalize = () =>
⋮----
const handleTargetRMSChange = (val: number) =>
⋮----
const handleMaxPeakChange = (val: number) =>
````

## File: src/components/shareBtn.tsx
````typescript
import { trackAppEvent } from "@/src/scripts/analytics";
⋮----
import Feather from "@expo/vector-icons/Feather";
⋮----
import React from "react";
import {
    StyleSheet,
    TouchableOpacity
} from "react-native";
⋮----
interface ShareBtnProps {
    uri: string;
}
const ShareBtn: React.FC<ShareBtnProps> = (
⋮----
const handleShare = async () =>
````

## File: eas.json
````json
{
  "cli": {
    "version": ">= 16.26.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_VARIANT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "autoIncrement": false,
      "android": {
        "buildType": "apk",
        "ndk": "28.1.13356709"
      }
    },
    "playstore": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle",
        "ndk": "28.1.13356709"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
````

## File: TODO.md
````markdown
## Features to Impliment

- [x] Auto stop & unload of audio or video when screen changes from current.
- [x] Add Attenuation limit(`atten_lim_db`) slider to process screen under advanced settings.
- [x] Add a option to normalise loudness of audio before denoising
- [ ] Add realtime Recording and denoising feature
- [x] Add tracker for analytics and crashes
- [ ] add a denoise toggle that switches the input and output audio without stopping the playback of audio or video.(For comparing)
````

## File: src/components/UpdateModal.tsx
````typescript
import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
⋮----
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { getSettings } from '../scripts/settings';
⋮----
interface UpdateInfo {
  version: string;
  url: string;
  notes: string;
  published_at: string;
}
⋮----
// true if building for Play Store
⋮----
const compareVersions = (v1: string, v2: string) =>
⋮----
const checkUpdates = async () =>
⋮----
// setVisible(true); // For test
⋮----
const handleDownload = async () =>
⋮----
const openGitHub = () =>
⋮----
<TouchableOpacity onPress=
````

## File: src/scripts/Denoiser.ts
````typescript
import metadata from "@/assets/model/model_metadata.json";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { readPCMChunks, writePCMChunk } from "./formatHandler";
⋮----
export class DeepFilterNet
⋮----
constructor()
⋮----
public async loadModel(modelPath: string): Promise<void>
⋮----
interOpNumThreads: 1, // Optimized for multi-core mobile CPUs
⋮----
public setupStreaming(attenLimDbValue: number = 0.0): void
⋮----
public async processFrame(frame: Float32Array): Promise<Float32Array>
⋮----
// Copy input frame data
⋮----
// Update output buffer and states
⋮----
public async release(): Promise<void>
⋮----
public resetStates(): void
⋮----
private initStates(attenLimDbValue: number = 0.0):
⋮----
/**
     * Denoise audio feed(s).
     */
public async denoise(
        audio: Float32Array | Float32Array[],
        onProgress?: ((p: number) => void) | ((p: number, i: number) => void),
        attenLimDbValue: number = 0.0,
): Promise<Float32Array | Float32Array[]>
⋮----
// Validate amplitude range for each feed
⋮----
/**
     * Denoises a PCM file and writes the output to a new PCM file.
     * This is memory-efficient for long audio files.
     */
public async denoiseFile(
        inputPcmFile: fs.File,
        outputPcmFile: fs.File,
        sampleRate: number,
        onProgress?: (p: number) => void,
        attenLimDbValue: number = 0.0,
        gain: number = 1.0,
): Promise<void>
⋮----
const samplesPerChunk = sampleRate * 5; // 5s chunks
⋮----
// Handle remaining samples in buffer
⋮----
private async runDenoiseLoop(
        audioFeeds: Float32Array[],
        onProgress?: ((p: number) => void) | ((p: number, i: number) => void),
        attenLimDbValue: number = 0.0,
): Promise<Float32Array[]>
⋮----
// ALIGNMENT: Prepend fftSize zeros for delay compensation
⋮----
// Prepare resources for all feeds
⋮----
// Initialize padded audio buffers
````

## File: .gitignore
````
# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/
*.lock
bun.lockb
yarn.lock
package-lock.json
# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo

app-example

# generated native folders
/ios
/android

.aiexclude
.geminiignore
GEMINI.md
/.agents
skills-lock.json
````

## File: src/app/share-handler.tsx
````typescript
import ErrorModal from "@/src/components/ErrorModal";
import { useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
⋮----
export default function ShareHandler()
⋮----
// In expo-sharing SDK 55, payload has contentUri, originalName, contentType
⋮----
// Navigate to processing screen
⋮----
// Clear shared payloads to avoid reprocessing
⋮----
onClose=
````

## File: src/components/videoPlayer.tsx
````typescript
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  View
} from "react-native";
⋮----
interface VideoPlayerProps {
  uri: string;
  name: string;
}
⋮----
// player.showNowPlayingNotification = true;r
// player.play();
````

## File: modules/AudioProcessorModule/android/src/main/java/expo/modules/audioprocessormodule/AudioProcessor.kt
````kotlin
package expo.modules.audioprocessormodule

import android.content.Context
import android.content.res.AssetFileDescriptor
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.linkedin.android.litr.MediaTransformer
import com.linkedin.android.litr.TransformationListener
import com.linkedin.android.litr.TransformationOptions
import com.linkedin.android.litr.analytics.TrackTransformationInfo
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

class MediaProcessor(private val context: Context) {

    private val mediaTransformer = MediaTransformer(context.applicationContext)

    private fun getSafeUri(path: String): Uri {
        return try {
            if (path.startsWith("content://") || path.startsWith("file://")) {
                Uri.parse(path)
            } else {
                Uri.fromFile(File(path))
            }
        } catch (e: Exception) {
            Uri.parse(path)
        }
    }

    private fun getSafePath(path: String): String {
        return try {
            val uri = getSafeUri(path)
            if (uri.scheme == "file") {
                uri.path ?: path
            } else {
                path
            }
        } catch (e: Exception) {
            path
        }
    }

    private fun setDataSource(extractor: MediaExtractor, path: String) {
        val uri = getSafeUri(path)
        if (uri.scheme == "content" || uri.scheme == "file") {
            context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { afd ->
                extractor.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            }
                    ?: throw Exception("Failed to open data source for URI: $path")
        } else {
            val file = File(getSafePath(path))
            if (!file.exists()) throw Exception("File does not exist: ${file.absolutePath}")
            FileInputStream(file).use { fis -> extractor.setDataSource(fis.fd) }
        }
    }

    private fun setDataSource(retriever: MediaMetadataRetriever, path: String) {
        val uri = getSafeUri(path)
        if (uri.scheme == "content" || uri.scheme == "file") {
            context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { afd ->
                retriever.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            }
                    ?: throw Exception("Failed to open data source for URI: $path")
        } else {
            val file = File(getSafePath(path))
            if (!file.exists()) throw Exception("File does not exist: ${file.absolutePath}")
            FileInputStream(file).use { fis -> retriever.setDataSource(fis.fd) }
        }
    }

    // (1) Audio Extraction & (3) Bitrate Re-encoding
    // Litr handles the demuxing and decoding/encoding pipeline internally.
    suspend fun transcodeAudio(
            inputPath: String,
            outputPath: String,
            targetBitrate: Int? = null
    ): String = suspendCancellableCoroutine { continuation ->
        val requestId = "transcode_${System.currentTimeMillis()}"

        val optionsBuilder =
                TransformationOptions.Builder().setGranularity(MediaTransformer.GRANULARITY_DEFAULT)

        val listener =
                object : TransformationListener {
                    override fun onStarted(id: String) {}
                    override fun onProgress(id: String, progress: Float) {}
                    override fun onCompleted(id: String, stats: List<TrackTransformationInfo>?) {
                        continuation.resume(outputPath)
                    }
                    override fun onCancelled(id: String, stats: List<TrackTransformationInfo>?) {
                        continuation.resumeWithException(Exception("Transformation cancelled"))
                    }
                    override fun onError(
                            id: String,
                            cause: Throwable?,
                            stats: List<TrackTransformationInfo>?
                    ) {
                        val message = cause?.message ?: "Unknown Litr Error"
                        continuation.resumeWithException(
                                Exception("Transcode failed ($inputPath): $message", cause)
                        )
                    }
                }

        // Get source sample rate to avoid pitch shift
        val extractor = MediaExtractor()
        var sourceSampleRate = 48000
        try {
            setDataSource(extractor, inputPath)
            val audioTrack = findTrackIndex(extractor, "audio/")
            if (audioTrack != -1) {
                val format = extractor.getTrackFormat(audioTrack)
                if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                    sourceSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                }
            }
        } catch (e: Exception) {
            // Fallback to 48000
        } finally {
            extractor.release()
        }

        // For extraction + re-encoding, we isolate the audio track
        // If targetBitrate is set, Litr will re-encode. Otherwise, it pass-throughs.
        mediaTransformer.transform(
                requestId,
                getSafeUri(inputPath),
                getSafeUri(outputPath),
                null, // Video format (null to drop video)
                if (targetBitrate != null) createAudioFormat(targetBitrate, sourceSampleRate)
                else null,
                listener,
                optionsBuilder.build()
        )

        continuation.invokeOnCancellation { mediaTransformer.cancel(requestId) }
    }

    // (5) Audio-Video Muxing
    // Combines video from videoPath and audio from audioPath
    suspend fun muxAudioVideo(videoPath: String, audioPath: String, outputPath: String): String =
            withContext(Dispatchers.IO) {
                var muxer: MediaMuxer? = null
                var videoExtractor: MediaExtractor? = null
                var audioExtractor: MediaExtractor? = null
                var isMuxerStarted = false
                var pfd: ParcelFileDescriptor? = null

                try {
                    // Setup muxer
                    val outputUri = getSafeUri(outputPath)
                    pfd = context.contentResolver.openFileDescriptor(outputUri, "rwt")
                            ?: throw Exception("Failed to open output file descriptor: $outputPath")
                    
                    muxer = MediaMuxer(pfd.fileDescriptor, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

                    // Setup video extractor
                    videoExtractor = MediaExtractor()
                    try {
                        setDataSource(videoExtractor, videoPath)
                    } catch (e: Exception) {
                        throw Exception("Failed to open video source: $videoPath. ${e.message}")
                    }
                    val videoTrack = findTrackIndex(videoExtractor, "video/")
                    if (videoTrack == -1) throw Exception("No video track found in $videoPath")
                    val videoFormat = videoExtractor.getTrackFormat(videoTrack)
                    val videoMuxerTrack = muxer.addTrack(videoFormat)

                    // Preserve video rotation
                    var rotation = 0
                    if (videoFormat.containsKey(MediaFormat.KEY_ROTATION)) {
                        rotation = videoFormat.getInteger(MediaFormat.KEY_ROTATION)
                    } else {
                        // Fallback to MediaMetadataRetriever
                        val retriever = MediaMetadataRetriever()
                        try {
                            setDataSource(retriever, videoPath)
                            val rotationStr =
                                    retriever.extractMetadata(
                                            MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION
                                    )
                            rotation = rotationStr?.toInt() ?: 0
                        } catch (e: Exception) {
                            // Ignore
                        } finally {
                            retriever.release()
                        }
                    }
                    muxer.setOrientationHint(rotation)

                    // Setup audio extractor
                    audioExtractor = MediaExtractor()
                    try {
                        setDataSource(audioExtractor, audioPath)
                    } catch (e: Exception) {
                        throw Exception(
                                "Failed to open audio source: $audioPath. ${e.message ?: e.toString()}"
                        )
                    }
                    val audioTrack = findTrackIndex(audioExtractor, "audio/")
                    if (audioTrack == -1) throw Exception("No audio track found in $audioPath")
                    val audioFormat = audioExtractor.getTrackFormat(audioTrack)
                    val audioMuxerTrack = muxer.addTrack(audioFormat)

                    muxer.start()
                    isMuxerStarted = true

                    // Determine max buffer size required by either track
                    val maxVideoSize =
                            if (videoFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                                videoFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                            } else {
                                1 * 1024 * 1024 // 1MB fallback
                            }
                    val maxAudioSize =
                            if (audioFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                                audioFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                            } else {
                                256 * 1024 // 256KB fallback
                            }
                    val bufferSize = Math.max(maxVideoSize, maxAudioSize).coerceAtMost(10 * 1024 * 1024) // Cap at 10MB safety
                    val buffer = ByteBuffer.allocate(bufferSize)
                    val bufferInfo = MediaCodec.BufferInfo()

                    videoExtractor.selectTrack(videoTrack)
                    audioExtractor.selectTrack(audioTrack)

                    var videoEOS = false
                    var audioEOS = false

                    while (!videoEOS || !audioEOS) {
                        val writeVideo =
                                !videoEOS &&
                                        (audioEOS ||
                                                videoExtractor.sampleTime <=
                                                        audioExtractor.sampleTime)

                        if (writeVideo) {
                            val sampleSize = videoExtractor.readSampleData(buffer, 0)
                            if (sampleSize < 0) {
                                videoEOS = true
                            } else {
                                bufferInfo.size = sampleSize
                                bufferInfo.offset = 0
                                bufferInfo.presentationTimeUs = videoExtractor.sampleTime
                                bufferInfo.flags = videoExtractor.sampleFlags
                                muxer.writeSampleData(videoMuxerTrack, buffer, bufferInfo)
                                videoExtractor.advance()
                            }
                        } else if (!audioEOS) {
                            val sampleSize = audioExtractor.readSampleData(buffer, 0)
                            if (sampleSize < 0) {
                                audioEOS = true
                            } else {
                                bufferInfo.size = sampleSize
                                bufferInfo.offset = 0
                                bufferInfo.presentationTimeUs = audioExtractor.sampleTime
                                bufferInfo.flags = audioExtractor.sampleFlags
                                muxer.writeSampleData(audioMuxerTrack, buffer, bufferInfo)
                                audioExtractor.advance()
                            }
                        }
                    }
                } finally {
                    if (isMuxerStarted) {
                        try {
                            muxer?.stop()
                        } catch (e: Exception) {
                            // Log or ignore
                        }
                    }
                    muxer?.release()
                    videoExtractor?.release()
                    audioExtractor?.release()
                    try {
                        pfd?.close()
                    } catch (e: Exception) {
                        // Ignore
                    }
                }
                outputPath
            }

    // (2) Audio Decoding to Raw PCM
    // Bypasses Litr. Drops down to MediaCodec to get raw byte buffers.
    suspend fun decodeToPCM(inputPath: String, outputPath: String): Map<String, Any> =
            withContext(Dispatchers.IO) {
                var extractor: MediaExtractor? = null
                var codec: MediaCodec? = null
                var outputStream: OutputStream? = null
                var isCodecStarted = false
                var sampleRate = 48000

                try {
                    extractor = MediaExtractor()
                    try {
                        setDataSource(extractor, inputPath)
                    } catch (e: Exception) {
                        throw Exception("Failed to open data source ($inputPath): ${e.message}")
                    }

                    var audioTrackIndex = -1
                    var format: MediaFormat? = null

                    for (i in 0 until extractor.trackCount) {
                        val f = extractor.getTrackFormat(i)
                        val mime = f.getString(MediaFormat.KEY_MIME)
                        if (mime?.startsWith("audio/") == true) {
                            audioTrackIndex = i
                            format = f
                            break
                        }
                    }

                    if (audioTrackIndex == -1 || format == null)
                            throw Exception("No audio track found in $inputPath")

                    extractor.selectTrack(audioTrackIndex)
                    val mime = format.getString(MediaFormat.KEY_MIME)
                            ?: throw Exception("MIME type missing for audio track in $inputPath")
                    
                    var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                        sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    }

                    try {
                        codec = MediaCodec.createDecoderByType(mime)
                    } catch (e: Exception) {
                        throw Exception(
                                "No decoder found for MIME type $mime ($inputPath): ${e.message}"
                        )
                    }

                    val outputUri = getSafeUri(outputPath)
                    outputStream = context.contentResolver.openOutputStream(outputUri)
                            ?: throw Exception("Failed to open output stream: $outputPath")

                    codec.configure(format, null, null, 0)
                    codec.start()
                    isCodecStarted = true

                    val info = MediaCodec.BufferInfo()
                    var isEOS = false
                    val timeoutUs = 10000L
                    var monoBuffer: ByteBuffer? = null

                    while (true) {
                        if (!isEOS) {
                            val inIndex = codec.dequeueInputBuffer(timeoutUs)
                            if (inIndex >= 0) {
                                val buffer = codec.getInputBuffer(inIndex)!!
                                val sampleSize = extractor.readSampleData(buffer, 0)
                                if (sampleSize < 0) {
                                    codec.queueInputBuffer(
                                            inIndex,
                                            0,
                                            0,
                                            0,
                                            MediaCodec.BUFFER_FLAG_END_OF_STREAM
                                    )
                                    isEOS = true
                                } else {
                                    codec.queueInputBuffer(
                                            inIndex,
                                            0,
                                            sampleSize,
                                            extractor.sampleTime,
                                            0
                                    )
                                    extractor.advance()
                                }
                            }
                        }

                        val outIndex = codec.dequeueOutputBuffer(info, timeoutUs)
                        when {
                            outIndex == MediaCodec.INFO_TRY_AGAIN_LATER -> if (isEOS) break
                            outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                                val newFormat = codec.outputFormat
                                if (newFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                                    sampleRate = newFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                                }
                                if (newFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
                                    channels = newFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                                }
                            }
                            outIndex >= 0 -> {
                                val outBuffer = codec.getOutputBuffer(outIndex)!!

                                // Downmix to mono if multi-channel (Interleaved 16-bit PCM assumed)
                                if (channels > 1 && info.size > 0) {
                                    outBuffer.position(info.offset)
                                    outBuffer.limit(info.offset + info.size)

                                    val shortBuffer = outBuffer.asShortBuffer()
                                    val numFrames = shortBuffer.remaining() / channels
                                    if (numFrames > 0) {
                                        val requiredSize = numFrames * 2
                                        if (monoBuffer == null || monoBuffer!!.capacity() < requiredSize) {
                                            monoBuffer = ByteBuffer.allocate(Math.min(requiredSize, 1 * 1024 * 1024))
                                            monoBuffer!!.order(java.nio.ByteOrder.LITTLE_ENDIAN)
                                        }
                                        monoBuffer!!.clear()

                                        for (f in 0 until numFrames) {
                                            var sum = 0
                                            for (c in 0 until channels) {
                                                if (shortBuffer.hasRemaining()) {
                                                    sum += shortBuffer.get()
                                                }
                                            }
                                            val monoSample = (sum / channels).toShort()
                                            if (monoBuffer!!.hasRemaining()) {
                                                monoBuffer!!.putShort(monoSample)
                                            }
                                        }
                                        outputStream.write(monoBuffer!!.array(), 0, monoBuffer!!.position())
                                    }
                                } else if (info.size > 0) {
                                    val chunk = ByteArray(info.size)
                                    outBuffer.position(info.offset)
                                    outBuffer.limit(info.offset + info.size)
                                    outBuffer.get(chunk)
                                    outputStream.write(chunk)
                                }

                                codec.releaseOutputBuffer(outIndex, false)
                                if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0)
                                        break
                            }
                        }
                    }
                } finally {
                    if (isCodecStarted) {
                        try {
                            codec?.stop()
                        } catch (e: Exception) {
                            // Log or ignore
                        }
                    }
                    codec?.release()
                    extractor?.release()
                    try {
                        outputStream?.close()
                    } catch (e: Exception) {
                        // Ignore
                    }
                }
                mapOf("path" to outputPath, "sampleRate" to sampleRate)
            }

    // (4) PCM to WAV Conversion
    // Appends the 44-byte RIFF header to a raw PCM file.
    suspend fun pcmToWav(
            pcmPath: String,
            wavPath: String,
            sampleRate: Int = 48000,
            channels: Int = 1,
            bitDepth: Int = 16
    ) =
            withContext(Dispatchers.IO) {
                val pcmUri = getSafeUri(pcmPath)
                val wavUri = getSafeUri(wavPath)
                
                var pcmDataLength: Long = 0
                context.contentResolver.openAssetFileDescriptor(pcmUri, "r")?.use { afd ->
                    pcmDataLength = afd.length
                } ?: throw Exception("Failed to open PCM input file: $pcmPath")
                
                if (pcmDataLength == AssetFileDescriptor.UNKNOWN_LENGTH) {
                    // Fallback: manually calculate length if AFDs don't report it (rare for local files)
                    context.contentResolver.openInputStream(pcmUri)?.use { isStream ->
                        pcmDataLength = 0
                        val skipBuffer = ByteArray(8192)
                        var read: Int
                        while (isStream.read(skipBuffer).also { read = it } != -1) {
                            pcmDataLength += read
                        }
                    } ?: throw Exception("Failed to calculate PCM data length: $pcmPath")
                }

                val totalDataLength = pcmDataLength + 36
                val byteRate = (sampleRate * channels * bitDepth) / 8

                context.contentResolver.openInputStream(pcmUri)?.use { inputStream ->
                    context.contentResolver.openOutputStream(wavUri)?.use { outputStream ->
                        writeWavHeader(
                                outputStream,
                                pcmDataLength,
                                totalDataLength,
                                sampleRate,
                                channels,
                                byteRate,
                                bitDepth
                        )
                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                            outputStream.write(buffer, 0, bytesRead)
                        }
                    } ?: throw Exception("Failed to open WAV output stream: $wavPath")
                } ?: throw Exception("Failed to open PCM input stream: $pcmPath")
                
                wavPath
            }

    private fun writeWavHeader(
            os: OutputStream,
            pcmDataLength: Long,
            totalDataLength: Long,
            sampleRate: Int,
            channels: Int,
            byteRate: Int,
            bitDepth: Int
    ) {
        val header = ByteArray(44)
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        header[4] = (totalDataLength and 0xffL).toByte()
        header[5] = ((totalDataLength shr 8) and 0xffL).toByte()
        header[6] = ((totalDataLength shr 16) and 0xffL).toByte()
        header[7] = ((totalDataLength shr 24) and 0xffL).toByte()
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte()
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        header[16] = 16 // Subchunk1Size (16 for PCM)
        header[17] = 0
        header[18] = 0
        header[19] = 0
        header[20] = 1 // AudioFormat 1 = PCM
        header[21] = 0
        header[22] = channels.toByte()
        header[23] = 0
        header[24] = (sampleRate and 0xff).toByte()
        header[25] = ((sampleRate shr 8) and 0xff).toByte()
        header[26] = ((sampleRate shr 16) and 0xff).toByte()
        header[27] = ((sampleRate shr 24) and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = ((byteRate shr 8) and 0xff).toByte()
        header[30] = ((byteRate shr 16) and 0xff).toByte()
        header[31] = ((byteRate shr 24) and 0xff).toByte()
        header[32] = ((channels * bitDepth) / 8).toByte()
        header[33] = 0 // block align
        header[34] = bitDepth.toByte()
        header[35] = 0 // bits per sample
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        header[40] = (pcmDataLength and 0xffL).toByte()
        header[41] = ((pcmDataLength shr 8) and 0xffL).toByte()
        header[42] = ((pcmDataLength shr 16) and 0xffL).toByte()
        header[43] = ((pcmDataLength shr 24) and 0xffL).toByte()
        os.write(header, 0, 44)
    }

    private fun findTrackIndex(extractor: MediaExtractor, mimeTypePrefix: String): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            if (format.getString(MediaFormat.KEY_MIME)?.startsWith(mimeTypePrefix) == true) {
                return i
            }
        }
        return -1
    }

    private fun createAudioFormat(bitrate: Int, sampleRate: Int = 48000): MediaFormat {
        val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, 1)
        format.setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
        return format
    }
}
````

## File: src/app/recording/index.tsx
````typescript
import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
⋮----
import { trackAppError, trackAppEvent } from "@/src/scripts/analytics";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import { PCMtoWav, saveToDevice, writePCMChunk } from "@/src/scripts/formatHandler";
import Feather from "@expo/vector-icons/Feather";
import {
  AudioDataEvent,
  RecordingConfig,
  useAudioRecorder
} from "@siteed/audio-studio";
import { Asset } from "expo-asset";
⋮----
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
⋮----
// We use refs for files to ensure the callback has immediate access to them
// without waiting for a re-render or being trapped in a stale closure.
⋮----
const initDenoiser = async () =>
⋮----
const handleAudioStream = async (event: AudioDataEvent) =>
⋮----
// Use a processing queue to ensure audio chunks are handled sequentially
⋮----
// 1. Save original PCM
⋮----
// 2. Denoise and save
⋮----
// Combine with previous leftovers
⋮----
// Store leftovers for next chunk
⋮----
const startRecording = async () =>
⋮----
// Initialize files
⋮----
// Reset denoiser states for new recording
⋮----
interval: 100, // Emit data every 100ms
⋮----
const stopRecording = async () =>
⋮----
// Wait for all background processing to finish
⋮----
// Handle any remaining samples in the buffer
⋮----
// Ensure files exist before wrapping
⋮----
const formatTime = (ms: number) =>
⋮----
onPress=
````

## File: README.md
````markdown
<p align="center">
  <img src="./assets/images/android-icon-background.png" alt="DeepDenoiser logo" width="120" />
</p>
<h1 align="center">DeepDenoiser</h1>
<p align="center">
  <a href="https://github.com/sayampy/deepdenoiser/releases">
    <img src="https://img.shields.io/github/v/release/sayampy/deepdenoiser?label=version" alt="Version">
  </a>
  <img src="https://img.shields.io/github/downloads/sayampy/deepdenoiser/total" alt="Downloads">
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/sayampy/deepdenoiser" alt="License">
  </a>
  <a href="https://www.android.com/">
    <img src="https://img.shields.io/badge/Platform-Android-green" alt="Platform">
  </a>
</p>
<p align="center">
  Offline AI audio denoiser for audio and video. Private, on-device, and fast.
</p>

<h2 align="center">Download From:</h2>
<p align="middle">
  <a href="https://play.google.com/store/apps/details?id=com.sayampy.deepdenoiser">
    <img src="./fastlane/metadata/android/en-US/images/en.svg" alt="Get it on Google Play" height="30" />
  </a>
  <a href="https://github.com/sayampy/deepdenoiser/releases">
    <img src="https://img.shields.io/badge/Github-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
</p>
<h2 align="center">Support This Project</h2>
<p align="middle">
  <a href="https://ko-fi.com/sayampy">
    <img src="https://img.shields.io/badge/Support-Ko--fi-F16061?style=for-the-badge&logo=kofi&logoColor=white" alt="Ko-fi" />
  </a>
  <a href="https://github.com/sponsors/sayampy"><img src="https://img.shields.io/badge/Github%20Sponsors-ff69b4?style=for-the-badge&logo=github" alt="GitHub Sponsors" /></a>
</p>

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
- **🎤 Live Suppression**: Capture voice recordings directly within the app with integrated, real-time noise removal.
- **🔒 Privacy First**: All processing happens locally on your device using ONNX Runtime. No data is ever uploaded to the cloud.
- **🚀 High Performance**: Built with custom Native Modules (Kotlin) for efficient media transcoding and I/O.
- **📱 Modern Design**: Clean, simple interface built with React Native & Expo.

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 55+)
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
````

## File: src/app/_layout.tsx
````typescript
import UpdateModal from "@/src/components/UpdateModal";
import { COLORS, FONT_SIZE, Styles } from "@/src/constants/theme";
import { initAnalytics, trackAppEvent } from "@/src/scripts/analytics";
import { Feather } from "@expo/vector-icons";
⋮----
import { useFonts } from "expo-font";
⋮----
import { createPermissionHook } from "expo-modules-core";
import { Stack } from "expo-router";
⋮----
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider
} from "react-native-safe-area-context";
⋮----
// Keep the splash screen visible while we fetch resources
⋮----
async function prepare()
⋮----
// Pre-load fonts or other resources here
// The useFonts hook handles the font loading, but we wait for it
⋮----
// Handle Permissions
⋮----
// Permission response is still loading
⋮----
const handleRequestPermissions = async () =>
````

## File: src/app/(tabs)/index.tsx
````typescript
import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
import VideoPlayer from "@/src/components/videoPlayer";
⋮----
import Feather from "@expo/vector-icons/Feather";
⋮----
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
⋮----
//Clears Cache
⋮----
const handleImportFile = async () =>
⋮----
// asset_file.rename(asset.name);
⋮----
const handleProceed = () =>
⋮----
source=
⋮----
{/* <View style={styles.infoBox}>
                <Feather name="info" size={16} color={theme.COLORS.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoText}>
                  Uses DeepFilterNet 3 model for high-quality background noise removal.
                </Text>
              </View> */}
````

## File: .github/workflows/android.yml
````yaml
name: Android Build

on:
  workflow_dispatch:
    inputs:
      branch:
        description: "Branch to build (defaults to current)"
        required: false
        type: string
      build_type:
        description: Build type
        required: true
        default: debug
        type: choice
        options:
          - debug
          - release-apk
          - release-aab

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          ref: ${{ inputs.branch || github.ref }}

      - name: Setup Node
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Setup Java
        uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: 17
          cache: gradle

      - name: Setup NDK
        uses: nttld/setup-ndk@v1.6
        with:
          ndk-version: r28b

      - name: Install dependencies
        run: bun install

      - name: Prebuild Android
        run: bunx expo prebuild --platform android --no-install

      - name: Install EAS CLI
        run: bun install -g eas-cli

      - name: Build with EAS local
        env:
          EXPO_TOKEN: ${{ secrets.EAS_TOKEN }}
        run: |
          set -euo pipefail

          case "${{ inputs.build_type }}" in
            debug)
              PROFILE=development
              ;;
            release-apk)
              PROFILE=production
              ;;
            release-aab)
              PROFILE=playstore
              ;;
            *)
              echo "Unknown build type: ${{ inputs.build_type }}"
              exit 1
              ;;
          esac

          eas build --platform android --profile "$PROFILE" --local

      - name: Upload artifact
        uses: actions/upload-artifact@v7
        with:
          name: android-${{ inputs.build_type }}
          path: |
            ~/**/*.apk
            ~/**/*.aab
          archive: false
          if-no-files-found: error
````

## File: src/components/audioPlayer.tsx
````typescript
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useCallback, useEffect } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
⋮----
interface AudioPlayerProps {
  uri: string;
  name: string;
}
⋮----
const handlePlayPause = () =>
⋮----
const formatTime = (seconds: number) =>
⋮----
<Text style=
````

## File: src/scripts/formatHandler.ts
````typescript
import {
  decodeToPCM,
  extractAndTranscodeAudio,
  mixAudioVideo,
  pcmToWav as nativePcmToWav
} from "@/modules/AudioProcessorModule";
⋮----
import { trackAppEvent } from "./analytics";
⋮----
export async function toWav(file: fs.File): Promise<fs.File>
⋮----
// We transcode to high-bitrate AAC first to handle resampling/downmixing via Litr
// if the source is not already compatible.
⋮----
256000, // High bitrate for quality
⋮----
// Then decode to PCM
⋮----
// Then wrap in WAV
⋮----
// Re-throw the error to be handled by the caller
⋮----
export async function decodeToPCMFile(file: fs.File): Promise<
⋮----
export async function PCMtoWav(file: fs.File, sampleRate: number = 48000): Promise<fs.File>
⋮----
// Use native pcmToWav to avoid loading entire file into memory as base64
⋮----
1, // channels (mono)
16 // bitDepth (16-bit)
⋮----
/**
 * Resamples an Int16Array or Float32Array from inputRate to outputRate using linear interpolation.
 */
export function resample(
  input: Int16Array | Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array
⋮----
export async function PCMtoArray(
  file: fs.File,
  inputRate?: number,
  targetRate?: number
): Promise<Float32Array>
⋮----
// If resampling is needed, we still need the full PCM in memory for the current resample impl
// but we can at least avoid one extra allocation
⋮----
const chunkSize = 256 * 1024; // 256KB chunks
⋮----
const chunkSize = 256 * 1024; // 256KB chunks
⋮----
export async function readPCMChunks(
  file: fs.File,
  chunkSize: number, // in samples
  onChunk: (chunk: Float32Array, inputSamples: number) => Promise<void>,
  inputRate?: number,
  targetRate?: number
): Promise<void>
⋮----
chunkSize: number, // in samples
⋮----
export async function writePCMChunk(
  file: fs.File,
  chunk: Float32Array,
  append: boolean
): Promise<void>
⋮----
// Process in chunks to avoid stack overflow with String.fromCharCode(...spread)
⋮----
export async function ArraytoPCM(f32array: Float32Array): Promise<fs.File>
⋮----
// Process and write in chunks to avoid large intermediate buffers
const chunkSize = 65536; // 64K samples = 128KB
⋮----
// Process in chunks to avoid stack overflow with String.fromCharCode
⋮----
export async function saveToDevice(file: fs.File)
⋮----
// Error logged in catch block or ignored if preferred
⋮----
export async function mergeAudioVideo(
  video: fs.File,
  audio: fs.File,
): Promise<fs.File>
⋮----
// Transcode the denoised WAV to AAC first, as MediaMuxer (MP4) often doesn't support PCM.
⋮----
128000, // 128kbps AAC
⋮----
export function renameFile(file: fs.File, newName: string): fs.File
````

## File: app.json
````json
{
  "expo": {
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "deepdenoiser",
    "userInterfaceStyle": "dark",
    "platforms": ["android"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sayampy.deepdenoiser"
    },
    "splash": {
      "backgroundColor": "#010100",
      "image": "./assets/images/splash.png",
      "resizeMode": "cover"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#010100",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "permissions": [
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "./plugins/withNdkVersion",
      "./plugins/DisableDependencyInfo",
      // [
      //   "./plugins/withFlexiblePgSize",
      //   {
      //     "gradleFile": "node_modules/onnxruntime-react-native/android/build.gradle"
      //   }
      // ],
      "./plugins/withOnnxruntime",
      // "onnxruntime-react-native",
      "expo-router",
      [
        "expo-build-properties",
        {
          "android": {
            "buildArchs": ["arm64-v8a"],
            "ndkVersion": "28.1.13356709",
            "enableBundleCompression": true,
            "enableMinifyInReleaseBuilds": true,
            "enableShrinkResoursesInReleaseBuilds": true,
            "shrinkResources": true,
            "enablePngCrunchInReleaseBuilds": false,
            "dependencies": [
              "com.linkedin.litr:litr:1.5.7",
              "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.3.9"
            ]
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#000000",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      "expo-font",
      [
        "expo-media-library",
        {
          "isAccessMediaLocationEnabled": true,
          "granularPermissions": ["audio", "video"]
        }
      ],
      "expo-asset",
      "expo-video",
      [
        "expo-audio",
        {
          "microphonePermission": "Allow DeepDenoiser to access your microphone for voice recording and denoising.",
          "enableBackgroundRecording": true
        }
      ],
      [
        "expo-sharing",
        {
          "android": {
            "enabled": true,
            "singleShareMimeTypes": ["video/*", "audio/*"]
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "41ed1c57-7435-4d0a-985f-24ac62b32272"
      }
    },
    "owner": "deepdenoiser"
  }
}
````

## File: src/app/processing/process.tsx
````typescript
import AdvanceSettings from "@/src/components/advanceSettings";
import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
import ShareBtn from "@/src/components/shareBtn";
import VideoPlayer from "@/src/components/videoPlayer";
⋮----
import { trackAppError, trackAppEvent } from "@/src/scripts/analytics";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import {
  decodeToPCMFile,
  mergeAudioVideo,
  PCMtoWav,
  readPCMChunks,
  renameFile,
  saveToDevice,
  writePCMChunk,
} from "@/src/scripts/formatHandler";
import Feather from "@expo/vector-icons/Feather";
import { Asset } from "expo-asset";
⋮----
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
⋮----
const timeHandler = (totalSeconds: number) =>
⋮----
const processFile = () =>
⋮----
const handleDenoise = async () =>
⋮----
onPress=
⋮----
backgroundColor: theme.COLORS.surface, // "rgba(0, 229, 255, 0.02)",
````

## File: package.json
````json
{
  "name": "deepdenoiser",
  "main": "expo-router/entry",
  "version": "1.4.1",
  "onnxruntimeExtensionsEnabled": "false",
  "scripts": {
    "start": "bunx expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "build:prod": "eas build -p android --profile production",
    "build:store": "eas build -p android --profile playstore",
    "build:dev": "eas build -p android --profile development",
    "postinstall": "patch-package"
  },
  "dependencies": {
    "@aptabase/react-native": "^0.4.0",
    "@expo/vector-icons": "^15.0.3",
    "@react-navigation/bottom-tabs": "^7.4.0",
    "@react-navigation/elements": "^2.8.1",
    "@react-navigation/native": "^7.1.8",
    "@siteed/audio-studio": "^3.0.3",
    "expo": "~55.0.18",
    "expo-asset": "~55.0.16",
    "expo-audio": "~55.0.14",
    "expo-build-properties": "~55.0.13",
    "expo-clipboard": "~55.0.13",
    "expo-constants": "~55.0.15",
    "expo-document-picker": "~55.0.13",
    "expo-file-system": "~55.0.17",
    "expo-font": "~55.0.6",
    "expo-haptics": "~55.0.14",
    "expo-linking": "~55.0.14",
    "expo-media-library": "~55.0.15",
    "expo-router": "~55.0.13",
    "expo-sharing": "~55.0.18",
    "expo-splash-screen": "~55.0.19",
    "expo-status-bar": "~55.0.5",
    "expo-symbols": "~55.0.7",
    "expo-system-ui": "~55.0.16",
    "expo-video": "~55.0.15",
    "onnxruntime-react-native": "^1.24.3",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-native": "0.83.6",
    "react-native-gesture-handler": "~2.30.0",
    "react-native-reanimated": "4.2.1",
    "react-native-safe-area-context": "^5.7.0",
    "react-native-screens": "~4.23.0",
    "react-native-web": "~0.21.2",
    "react-native-worklets": "0.7.4"
  },
  "devDependencies": {
    "@types/react": "~19.2.10",
    "eslint": "^9.39.1",
    "eslint-config-expo": "~55.0.0",
    "expo-dev-client": "~55.0.28",
    "patch-package": "^8.0.1",
    "typescript": "~5.9.3"
  },
  "private": true,
  "trustedDependencies": [
    "unrs-resolver"
  ]
}
````
