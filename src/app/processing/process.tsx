import AudioPlayer from "@/src/components/audioPlayer";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import {
  ArraytoPCM,
  PCMtoArray,
  PCMtoWav,
  WavtoPCM,
  mergeAudioVideo,
  saveToDevice,
  toWav,
} from "@/src/scripts/formatHandler";
import { Feather } from "@expo/vector-icons";
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
  const { fileuri } = useLocalSearchParams<{ fileuri: string }>();

  const [originalFile, setOriginalFile] = useState<fs.File | null>(null);
  const [tempWavFile, setTempWavFile] = useState<fs.File | null>(null);
  const [isFileTypeVideo, setIsFileTypeVideo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [denoising, setDenoising] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [denoisedFile, setDenoisedFile] = useState<fs.File | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

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

    const processFile = async () => {
      try {
        setIsLoading(true);
        const inputFile = new fs.File(fileuri);
        setOriginalFile(inputFile);

        // Detect if video or audio from extension or mime (simple check)
        const isVideo = fileuri.toLowerCase().endsWith('.mp4') ||
          fileuri.toLowerCase().endsWith('.mov') ||
          fileuri.toLowerCase().endsWith('.mkv');
        setIsFileTypeVideo(isVideo);

        // Convert/Extract to WAV for processing
        const wavFile = await toWav(inputFile);
        setTempWavFile(wavFile);
      } catch (error) {
        console.error("Error preparing file:", error);
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    processFile();
  }, [fileuri, router]);

  const handleDenoise = async () => {
    if (!tempWavFile || !originalFile) return;

    setDenoising(true);
    setProgress(0);
    setProgressText("Initializing...");
    setEta(null);

    try {
      setProgressText("Converting to PCM...");
      const pcmFile = await WavtoPCM(tempWavFile);

      setProgressText("Reading audio data...");
      const float32Array = await PCMtoArray(pcmFile);

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
      });
      setEta(null);

      setProgressText("Saving denoised audio...");
      const denoisedPcmFile = await ArraytoPCM(denoisedArray);

      setProgressText("Finalizing audio...");
      const finalWavFile = await PCMtoWav(denoisedPcmFile);

      if (isFileTypeVideo) {
        setProgressText("Merging with video...");
        const finalVideoFile = await mergeAudioVideo(originalFile, finalWavFile);
        setDenoisedFile(finalVideoFile);
      } else {
        setDenoisedFile(finalWavFile);
      }
      setProcessingTime((Date.now() - startTime) / 1000);
    } catch (error) {
      console.error("Error during denoising:", error);
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
      <View style={[theme.Styles.header, styles.headerContainer]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
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
                <VideoPlayer uri={originalFile.uri} />
              ) : (
                <AudioPlayer uri={originalFile.uri} />
              )
            )}
          </View>
        </View>

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
            <View style={theme.Styles.row}>
              <Feather
                name="check-circle"
                size={20}
                color={theme.COLORS.success}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  { marginLeft: 8, marginBottom: 0 },
                ]}
              >
                Denoised Result
              </Text>
            </View>
            <View style={styles.playerContainer}>
              {isFileTypeVideo ? (
                <VideoPlayer uri={denoisedFile.uri} />
              ) : (
                <AudioPlayer uri={denoisedFile.uri} />
              )}
            </View>
            <TouchableOpacity
              style={{ marginTop: 8, }}
              disabled={!denoisedFile}
              onPress={async () => {
                if (denoisedFile) {
                  await saveToDevice(denoisedFile);
                }
              }}
            >
              <Feather name="download" size={24} color={theme.COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.etaText}>
              Took: {timeHandler(processingTime)}
            </Text>
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
    width: 35,
  },
  etaText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
    marginTop: 8,
    textAlign: "right",
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
  },
});
