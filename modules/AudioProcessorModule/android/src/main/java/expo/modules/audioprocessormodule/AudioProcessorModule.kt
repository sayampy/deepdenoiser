package expo.modules.audioprocessormodule

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.cancel
import java.io.File

class AudioProcessorModule : Module() {
    private val moduleScope = CoroutineScope(Dispatchers.IO)

    override fun definition() = ModuleDefinition {
        Name("AudioProcessorModule")

        OnDestroy {
            moduleScope.cancel()
            appContext.reactContext?.let { DenoiseForegroundService.stop(it) }
        }

        AsyncFunction("startBackgroundProcessing") { promise: expo.modules.kotlin.Promise ->
            try {
                val context = appContext.reactContext
                    ?: throw IllegalStateException("React Context is null")
                DenoiseForegroundService.start(context)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_FOREGROUND_SERVICE", e.message ?: e.toString(), e)
            }
        }

        AsyncFunction("stopBackgroundProcessing") { promise: expo.modules.kotlin.Promise ->
            try {
                appContext.reactContext?.let { DenoiseForegroundService.stop(it) }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_FOREGROUND_SERVICE", e.message ?: e.toString(), e)
            }
        }

        AsyncFunction("installApk") { path: String, promise: expo.modules.kotlin.Promise ->
            try {
                val context = appContext.reactContext
                    ?: throw IllegalStateException("React Context is null")
                val activity = appContext.currentActivity
                    ?: throw IllegalStateException("No foreground activity is available")
                val uri = Uri.parse(path)
                val apkFile = if (uri.scheme == "file") {
                    File(uri.path ?: throw IllegalArgumentException("Invalid APK file URI"))
                } else {
                    File(path)
                }
                require(apkFile.isFile) { "Downloaded APK does not exist" }

                val contentUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.FileSystemFileProvider",
                    apkFile
                )
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(contentUri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.runOnUiThread {
                    try {
                        activity.startActivity(intent)
                        promise.resolve(true)
                    } catch (e: Exception) {
                        promise.reject("ERR_APK_INSTALL", e.message ?: e.toString(), e)
                    }
                }
            } catch (e: Exception) {
                promise.reject("ERR_APK_INSTALL", e.message ?: e.toString(), e)
            }
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

        AsyncFunction("saveFileToTree") {
                sourceUri: String,
                treeUri: String,
                directoryNames: List<String>,
                fileName: String,
                mimeType: String?,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    val result =
                            processor.saveFileToTree(
                                    sourceUri,
                                    treeUri,
                                    directoryNames,
                                    fileName,
                                    mimeType
                            )
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ERR_SAVE_TO_FOLDER", e.message ?: e.toString(), e)
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

        AsyncFunction("sha256File") {
                path: String,
                promise: expo.modules.kotlin.Promise ->
            moduleScope.launch {
                try {
                    val processor =
                            MediaProcessor(
                                    appContext.reactContext
                                            ?: throw Exception("React Context is null")
                            )
                    promise.resolve(processor.sha256File(path))
                } catch (e: Exception) {
                    promise.reject("ERR_HASH_FILE", e.message ?: e.toString(), e)
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
