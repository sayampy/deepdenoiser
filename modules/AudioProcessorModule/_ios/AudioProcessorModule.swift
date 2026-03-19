import ExpoModulesCore

public class AudioProcessorModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('AudioProcessorModule')` in JavaScript.
    Name("AudioProcessorModule")

    AsyncFunction("extractAndTranscodeAudio") { (input: String, output: String, bitrate: Int?) in
      throw NSError(domain: "AudioProcessorModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not implemented on iOS yet"])
    }

    AsyncFunction("decodeToPCM") { (input: String, output: String) in
      throw NSError(domain: "AudioProcessorModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not implemented on iOS yet"])
    }

    AsyncFunction("pcmToWav") { (pcmInput: String, wavOutput: String, sampleRate: Int, channels: Int, bitDepth: Int) in
      throw NSError(domain: "AudioProcessorModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not implemented on iOS yet"])
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of the
    // view definition: Prop, Events.
    View(AudioProcessorModuleView.self) {
      // Defines a setter for the `url` prop.
      Prop("url") { (view: AudioProcessorModuleView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      Events("onLoad")
    }
  }
}
