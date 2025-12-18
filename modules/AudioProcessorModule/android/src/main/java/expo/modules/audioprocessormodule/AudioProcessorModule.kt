package expo.modules.audioprocessormodule

import android.content.Context
import android.net.Uri
import com.linkedin.android.litr.MediaTransformer
import com.linkedin.android.litr.callbacks.TransformationListener
import com.linkedin.android.litr.codec.MediaCodecDecoder
import com.linkedin.android.litr.codec.MediaCodecEncoder
import com.linkedin.android.litr.utils.TransformationUtil
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

class AudioProcessorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioProcessor")

    AsyncFunction("convertToPcm") { sourceUri: String, destPath: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val transformer = MediaTransformer(context)
      
      // Configuration for 48kHz PCM Raw
      val audioFormat = android.media.MediaFormat.createAudioFormat(
          android.media.MediaFormat.MIMETYPE_AUDIO_RAW, 48000, 1
      )

      transformer.transform(
          "job-pcm-id",
          Uri.parse(sourceUri),
          destPath,
          null, // No video track
          audioFormat,
          object : TransformationListener {
              override fun onStarted(id: String) { /* Log start */ }
              override fun onProgress(id: String, progress: Float) { /* Send event to JS */ }
              override fun onCompleted(id: String, stats: List<com.linkedin.android.litr.analytics.TrackTransformationStats>?) {
                  // Transformation success
              }
              override fun onError(id: String, cause: Throwable?, stats: List<com.linkedin.android.litr.analytics.TrackTransformationStats>?) {
                  // Handle error
              }
              override fun onCancelled(id: String, stats: List<com.linkedin.android.litr.analytics.TrackTransformationStats>?) {}
          },
          TransformationUtil.WRITE_MODE_OVERWRITE
      )
    }
  }
}