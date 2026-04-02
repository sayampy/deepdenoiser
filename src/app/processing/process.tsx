import AdvanceSettings from "@/src/components/advanceSettings";
import AudioPlayer from "@/src/components/audioPlayer";
import ShareBtn from "@/src/components/shareBtn";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import { trackAppError, trackAppEvent } from "@/src/scripts/analytics";
import { normalizeAudio } from "@/src/scripts/AudioProcess";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import {
  ArraytoPCM,
  PCMtoArray,
  PCMtoWav,
  WavtoPCM,
  mergeAudioVideo,
  renameFile,
  saveToDevice,
  toWav,
} from "@/src/scripts/formatHandler";
import Feather from "@expo/vector-icons/Feather";
import { Asset } from "expo-asset";
import * as fs from "expo-file-system";
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

export default function ProcessScreen() {
  const router = useRouter();
  const { fileuri, filename } = useLocalSearchParams<{ fileuri: string, filename: string }>();

  const [originalFile, setOriginalFile] = useState<fs.File | null>(null);
  const [isFileTypeVideo, setIsFileTypeVideo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [denoising, setDenoising] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [denoisedFile, setDenoisedFile] = useState<fs.File | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [attenLimDb, setAttenLimDb] = useState(0);
  const [normalize, setNormalize] = useState<{
    toggle: boolean;
    targetRMS: number;
    maxPeakDb: number;
  }>({
    toggle: false,
    targetRMS: -14.0,
    maxPeakDb: -1.0,
  });

  const timeHandler = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    if (h > 0) return `${h}h:${m}m:${s}s`;
    if (m > 0) return `${m}m:${s}s`;
    return `${s}s`;
  };

  useEffect(() => {
    if (!fileuri) {
      router.navigate("/");
      return;
    }

    const processFile = () => {
      try {
        setIsLoading(true);
        const inputFile = new fs.File(fileuri);
        setOriginalFile(inputFile);
        console.debug("File Type:", inputFile.type);
        // Detect if video or audio from extension or mime (simple check)
        const isVideo = !!inputFile.type?.startsWith("video") ||
          filename.toLowerCase().endsWith(".mp4") ||
          filename.toLowerCase().endsWith(".mov") ||
          filename.toLowerCase().endsWith(".mkv") ||
          filename.toLowerCase().endsWith(".avi") ||
          filename.toLowerCase().endsWith(".m4v") ||
          filename.toLowerCase().endsWith(".webm");
        setIsFileTypeVideo(isVideo);


      } catch (error) {
        console.error("Error preparing file:", error);
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    processFile();
  }, [fileuri, filename, router]);

  const handleDenoise = async () => {
    if (!originalFile) return;

    setDenoising(true);
    setProgress(0);
    setProgressText("Initializing...");
    setEta(null);
    setDenoisedFile(null);
    try {
      // Convert/Extract to WAV for processing
      setProgressText("Converting to WAV...")
      const wavFile = await toWav(originalFile);
      setProgressText("Converting to PCM...");
      const pcmFile = await WavtoPCM(wavFile);
      setProgressText("Reading audio data...");
      let float32Array = await PCMtoArray(pcmFile);

      if (normalize?.toggle) {
        setProgressText("Normalizing audio...");
        float32Array = normalizeAudio(float32Array, normalize.targetRMS, normalize.maxPeakDb);
      }

      setProgressText("Loading AI model...");
      const denoiser = new DeepFilterNet();
      const modelAsset = Asset.fromModule(
        require("@/assets/model/denoiser_model.ort"),
      );
      await modelAsset.downloadAsync();
      await denoiser.loadModel(modelAsset.localUri!);

      setProgressText("Denoising...");
      const startTime = Date.now();
      const denoisedArray = await denoiser.denoise(float32Array, (p) => {
        setProgress(p);
        if (p > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = elapsed / (p / 100) - elapsed;
          if (remaining > 0 && Number.isFinite(remaining)) {
            const totalSeconds = Math.ceil(remaining);
            setEta(`${timeHandler(totalSeconds)} remaining`);
          }
        }
      }, attenLimDb);
      setEta(null);

      setProgressText("Saving denoised audio...");
      const denoisedPcmFile = await ArraytoPCM(denoisedArray);

      setProgressText("Finalizing audio...");
      const baseName = filename.split('.').slice(0, -1).join('.').replaceAll('%20', '\s');
      /*(filename.substring(0, filename.lastIndexOf('.')). || filename || `denoised_${Date.now()}`;*/
      const finalWavFile = await PCMtoWav(denoisedPcmFile);
      renameFile(finalWavFile, `${baseName}_denoised.wav`)
      if (isFileTypeVideo) {
        setProgressText("Merging with video...");
        const finalVideoFile = await mergeAudioVideo(originalFile, finalWavFile);
        renameFile(finalVideoFile, `${baseName}_denoised.mp4`);
        setDenoisedFile(finalVideoFile);
      } else {
        setDenoisedFile(finalWavFile);
      }
      const duration = (Date.now() - startTime) / 1000;
      setProcessingTime(duration);

      trackAppEvent("denoise_complete", {
        duration: processingTime,
        file_type: isFileTypeVideo ? "video" : "audio",
        atten_lim: attenLimDb,
        normalized: normalize.toggle,
      });
    } catch (error) {
      console.error("Error during denoising:", error);
      trackAppError(error instanceof Error ? error : new Error(String(error)), {
        context: "handleDenoise",
      });
    } finally {
      setDenoising(false);
      setProgressText("");
      setEta(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[theme.Styles.container, theme.Styles.centered]}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
        <Text style={styles.loadingText}>Preparing media...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={theme.Styles.container}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
          disabled={denoising}
        >
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={theme.Styles.title}>Process {isFileTypeVideo ? 'Video' : 'Audio'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={theme.Styles.card}>
          <Text style={styles.sectionTitle}>Original {isFileTypeVideo ? 'Video' : 'Audio'}</Text>
          <View style={styles.playerContainer}>
            {originalFile && (
              isFileTypeVideo ? (
                <VideoPlayer uri={originalFile.uri} name={filename} />
              ) : (
                <AudioPlayer uri={originalFile.uri} name={filename} />
              )
            )}
          </View>
        </View>

        <AdvanceSettings
          attenLimDb={attenLimDb}
          onAttenLimDbChange={setAttenLimDb}
          normalize={normalize}
          onNormalizeChange={setNormalize}
        />

        {denoising && (
          <View style={[theme.Styles.card, styles.progressCard, { marginTop: 20 }]}>
            <Text style={styles.progressLabel}>{progressText}</Text>
            <View style={styles.progressInfo}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            {eta && <Text style={styles.etaText}>{eta}</Text>}
          </View>
        )}

        {denoisedFile && (
          <View style={[styles.resultCard, { marginTop: 20 }]}>
            <View style={[theme.Styles.row, { marginBottom: theme.SPACING.medium }]}>
              <Feather
                name="check-circle"
                size={20}
                color={theme.COLORS.success}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  { marginLeft: 8, marginBottom: 0, flex: 1 },
                ]}
              >
                Denoised Result
              </Text>
              <View style={[styles.timeStats]}>
                <Feather name="clock" size={14} color={theme.COLORS.subtext} />
                <Text style={styles.timeText}>{timeHandler(processingTime)}</Text>
              </View>
            </View>
            <View>
              {isFileTypeVideo ? (
                <VideoPlayer uri={denoisedFile.uri} name={denoisedFile.name} />
              ) : (
                <AudioPlayer uri={denoisedFile.uri} name={denoisedFile.name} />
              )}
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.saveButton}
                disabled={!denoisedFile}
                onPress={async () => {
                  if (denoisedFile) {
                    await saveToDevice(denoisedFile);
                  }
                }}
              >
                <Feather name="download" size={18} color={theme.COLORS.background} />
                <Text style={styles.saveButtonText}>Save to Device</Text>
              </TouchableOpacity>
              <ShareBtn uri={denoisedFile ? denoisedFile.uri : ""} />
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!denoisedFile ? (
          <TouchableOpacity
            style={[
              theme.Styles.button,
              denoising && theme.Styles.disabledButton,
              { width: "100%" },
            ]}
            onPress={handleDenoise}
            disabled={denoising}
          >
            {denoising ? (
              <ActivityIndicator
                color={theme.COLORS.background}
                style={{ marginRight: 10 }}
              />
            ) : (
              <Feather
                name="zap"
                size={20}
                color={theme.COLORS.background}
                style={{ marginRight: 10 }}
              />
            )}
            <Text style={theme.Styles.buttonText}>
              {denoising ? "Processing..." : "Start Denoising"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View>
            <TouchableOpacity
              style={[
                theme.Styles.button,
                {
                  width: "100%",
                  marginBottom: 12,
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: theme.COLORS.primary,
                },
              ]}
              onPress={handleDenoise}
            >
              <Feather
                name="refresh-ccw"
                size={20}
                color={theme.COLORS.primary}
                style={{ marginRight: 10 }}
              />
              <Text style={[theme.Styles.buttonText, { color: theme.COLORS.primary }]}>
                Restart
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[theme.Styles.button, { width: "100%" }]}
              onPress={() => router.replace("/")}
            >
              <Feather
                name="refresh-cw"
                size={20}
                color={theme.COLORS.background}
                style={{ marginRight: 10 }}
              />
              <Text style={theme.Styles.buttonText}>Process Another File</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    left: 0,
    top: 10,
    padding: 8,
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    marginTop: theme.SPACING.xsmall,
    fontSize: theme.FONT_SIZE.heading,
    zIndex: 10,
    alignItems: "center",
    marginBottom: theme.SPACING.medium,
  },
  sectionTitle: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    color: theme.COLORS.primary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.subtext,
  },
  playerContainer: {
    padding: 4,
  },
  progressCard: {
    backgroundColor: theme.COLORS.surface,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  progressLabel: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    marginBottom: 12,
    fontWeight: "600",
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.COLORS.primary,
  },
  progressPercent: {
    color: theme.COLORS.primary,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "700",
    width: 40,
  },
  etaText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
    marginTop: 8,
    textAlign: "right",
  },
  resultActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  saveButton: {
    backgroundColor: theme.COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: theme.COLORS.background,
    fontWeight: "600",
    fontSize: theme.FONT_SIZE.small,
  },
  timeStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "500",
  },
  resultCard: {
    borderColor: theme.COLORS.success,
    backgroundColor: theme.COLORS.surface,
    borderRadius: 16,
    padding: theme.SPACING.medium,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  footer: {
    paddingBottom: theme.SPACING.xlarge,
    backgroundColor: theme.COLORS.background,
    paddingTop: theme.SPACING.small,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
});
