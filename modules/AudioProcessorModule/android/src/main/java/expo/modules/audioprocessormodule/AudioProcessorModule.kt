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

        AsyncFunction("extractAndTranscodeAudio") { input: String, output: String, bitrate: Int?, promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor = MediaProcessor(appContext.reactContext ?: throw Exception("React Context is null"))
                    val result = processor.transcodeAudio(input, output, bitrate)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_TRANSCODE", e.message, e)
                }
            }
        }

        AsyncFunction("decodeToPCM") { input: String, output: String, promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor = MediaProcessor(appContext.reactContext ?: throw Exception("React Context is null"))
                    val result = processor.decodeToPCM(input, output)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_DECODE", e.message, e)
                }
            }
        }

        AsyncFunction("pcmToWav") { pcmInput: String, wavOutput: String, sampleRate: Int, channels: Int, bitDepth: Int, promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor = MediaProcessor(appContext.reactContext ?: throw Exception("React Context is null"))
                    val result = processor.pcmToWav(pcmInput, wavOutput, sampleRate, channels, bitDepth)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_WAV_CONV", e.message, e)
                }
            }
        }
    }
}
