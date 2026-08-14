package expo.modules.audioprocessormodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.cancel

class AudioProcessorModule : Module() {
    private val moduleScope = CoroutineScope(Dispatchers.IO)

    override fun definition() = ModuleDefinition {
        Name("AudioProcessorModule")

        OnDestroy {
            moduleScope.cancel()
        }

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
                silenceTrim: Map<String, Any?>?,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result =
                            processor.pcmToWav(
                                    pcmInput,
                                    wavOutput,
                                    sampleRate,
                                    channels,
                                    bitDepth,
                                    silenceTrim
                            )
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_WAV_CONV", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("extractWavAudio") {
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
                    val result = processor.extractWavAudio(input, output)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_WAV_EXTRACT", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("copyFile") {
                sourceUri: String,
                destUri: String,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result = processor.copyFile(sourceUri, destUri)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_COPY_FILE", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("getFileSize") {
                path: String,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result = processor.getFileSize(path)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_GET_FILE_SIZE", e.message ?: e.toString(), e)
                }
            }
        }

        AsyncFunction("mixAudioVideo") {
                videoPath: String,
                audioPath: String,
                outputPath: String,
                trim: Map<String, Any?>?,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result = processor.muxAudioVideo(videoPath, audioPath, outputPath, trim)
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_MUX_AUDIO_VIDEO", e.message ?: e.toString(), e)
                }
            }
        }
    }
}
