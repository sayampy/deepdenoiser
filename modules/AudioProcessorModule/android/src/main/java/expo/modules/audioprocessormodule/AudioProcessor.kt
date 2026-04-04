package expo.modules.audioprocessormodule

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import com.linkedin.android.litr.MediaTransformer
import com.linkedin.android.litr.TransformationListener
import com.linkedin.android.litr.TransformationOptions
import com.linkedin.android.litr.analytics.TrackTransformationInfo
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
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

    // (1) Audio Extraction & (3) Bitrate Re-encoding
    // Litr handles the demuxing and decoding/encoding pipeline internally.
    suspend fun transcodeAudio(inputPath: String, outputPath: String, targetBitrate: Int? = null): String =
            suspendCancellableCoroutine { continuation ->
                val requestId = "transcode_${System.currentTimeMillis()}"

                val optionsBuilder =
                        TransformationOptions.Builder()
                                .setGranularity(MediaTransformer.GRANULARITY_DEFAULT)

                val listener =
                        object : TransformationListener {
                            override fun onStarted(id: String) {}
                            override fun onProgress(id: String, progress: Float) {}
                            override fun onCompleted(
                                    id: String,
                                    stats: List<TrackTransformationInfo>?
                            ) {
                                continuation.resume(outputPath)
                            }
                            override fun onCancelled(
                                    id: String,
                                    stats: List<TrackTransformationInfo>?
                            ) {
                                continuation.resumeWithException(
                                        Exception("Transformation cancelled")
                                )
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
                    extractor.setDataSource(context, getSafeUri(inputPath), null)
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
                        outputPath,
                        null, // Video format (null to drop video)
                        if (targetBitrate != null) createAudioFormat(targetBitrate, sourceSampleRate) else null,
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

                try {
                    // Setup muxer
                    muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

                    // Setup video extractor
                    videoExtractor = MediaExtractor()
                    try {
                        videoExtractor.setDataSource(context, getSafeUri(videoPath), null)
                    } catch (e: Exception) {
                        throw Exception("Failed to open video source: $videoPath. ${e.message}")
                    }
                    val videoTrack = findTrackIndex(videoExtractor, "video/")
                    if (videoTrack == -1) throw Exception("No video track found in $videoPath")
                    val videoFormat = videoExtractor.getTrackFormat(videoTrack)
                    val videoMuxerTrack = muxer.addTrack(videoFormat)

                    // Setup audio extractor
                    audioExtractor = MediaExtractor()
                    try {
                        audioExtractor.setDataSource(context, getSafeUri(audioPath), null)
                    } catch (e: Exception) {
                        throw Exception("Failed to open audio source: $audioPath. ${e.message}")
                    }
                    val audioTrack = findTrackIndex(audioExtractor, "audio/")
                    if (audioTrack == -1) throw Exception("No audio track found in $audioPath")
                    val audioFormat = audioExtractor.getTrackFormat(audioTrack)
                    val audioMuxerTrack = muxer.addTrack(audioFormat)

                    muxer.start()
                    isMuxerStarted = true

                    val buffer = ByteBuffer.allocate(1 * 1024 * 1024)
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
                }
                outputPath
            }

    // (2) Audio Decoding to Raw PCM
    // Bypasses Litr. Drops down to MediaCodec to get raw byte buffers.
    suspend fun decodeToPCM(inputPath: String, outputPath: String): Map<String, Any> =
            withContext(Dispatchers.IO) {
                var extractor: MediaExtractor? = null
                var codec: MediaCodec? = null
                var fos: FileOutputStream? = null
                var isCodecStarted = false
                var sampleRate = 48000

                try {
                    extractor = MediaExtractor()
                    try {
                        extractor.setDataSource(context, getSafeUri(inputPath), null)
                    } catch (e: Exception) {
                        throw Exception("Failed to open data source ($inputPath): ${e.message}")
                    }

                    var audioTrackIndex = -1
                    var format: MediaFormat? = null

                    for (i in 0 until extractor.trackCount) {
                        val f = extractor.getTrackFormat(i)
                        if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
                            audioTrackIndex = i
                            format = f
                            break
                        }
                    }

                    if (audioTrackIndex == -1 || format == null)
                            throw Exception("No audio track found in $inputPath")

                    extractor.selectTrack(audioTrackIndex)
                    val mime = format.getString(MediaFormat.KEY_MIME)!!
                    val channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                        sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    }
                    
                    try {
                        codec = MediaCodec.createDecoderByType(mime)
                    } catch (e: Exception) {
                        throw Exception("No decoder found for MIME type $mime ($inputPath): ${e.message}")
                    }

                    fos = FileOutputStream(outputPath)

                    codec.configure(format, null, null, 0)
                    codec.start()
                    isCodecStarted = true

                    val info = MediaCodec.BufferInfo()
                    var isEOS = false
                    val timeoutUs = 10000L

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
                            outIndex >= 0 -> {
                                val outBuffer = codec.getOutputBuffer(outIndex)!!
                                
                                // Downmix to mono if multi-channel (Interleaved 16-bit PCM assumed)
                                if (channels > 1 && info.size > 0) {
                                    outBuffer.position(info.offset)
                                    outBuffer.limit(info.offset + info.size)
                                    
                                    val shortBuffer = outBuffer.asShortBuffer()
                                    val numFrames = shortBuffer.remaining() / channels
                                    val monoBuffer = ByteBuffer.allocate(numFrames * 2)
                                    monoBuffer.order(java.nio.ByteOrder.LITTLE_ENDIAN)
                                    
                                    for (f in 0 until numFrames) {
                                        var sum = 0
                                        for (c in 0 until channels) {
                                            sum += shortBuffer.get()
                                        }
                                        val monoSample = (sum / channels).toShort()
                                        monoBuffer.putShort(monoSample)
                                    }
                                    fos.write(monoBuffer.array())
                                } else if (info.size > 0) {
                                    val chunk = ByteArray(info.size)
                                    outBuffer.position(info.offset)
                                    outBuffer.limit(info.offset + info.size)
                                    outBuffer.get(chunk)
                                    fos.write(chunk)
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
                    fos?.close()
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
                val pcmFile = File(pcmPath)
                val pcmDataLength = pcmFile.length()
                val totalDataLength = pcmDataLength + 36
                val byteRate = (sampleRate * channels * bitDepth) / 8

                FileInputStream(pcmFile).use { fis ->
                    FileOutputStream(wavPath).use { fos ->
                        writeWavHeader(
                                fos,
                                pcmDataLength,
                                totalDataLength,
                                sampleRate,
                                channels,
                                byteRate,
                                bitDepth
                        )
                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        while (fis.read(buffer).also { bytesRead = it } != -1) {
                            fos.write(buffer, 0, bytesRead)
                        }
                    }
                }
                wavPath
            }

    private fun writeWavHeader(
            fos: FileOutputStream,
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
        header[16] = 16
        header[17] = 0
        header[18] = 0
        header[19] = 0 // 16 for PCM
        header[20] = 1
        header[21] = 0 // AudioFormat 1 = PCM
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
        fos.write(header, 0, 44)
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
