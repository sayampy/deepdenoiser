import AudioPlayer from "@/src/components/audioPlayer";
import * as theme from "@/src/constants/theme";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import { ArraytoPCM, PCMtoArray, PCMtoWav, WavtoPCM, toWav } from "@/src/scripts/formatHandler";
import { Feather } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as fs from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProcessScreen() {
  const router = useRouter();
  const { fileuri } = useLocalSearchParams<{ fileuri: string }>();
  const [tempFile, setTempFile] = useState<fs.File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [denoising, setDenoising] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [denoisedFile, setDenoisedFile] = useState<fs.File | null>(null);

  useEffect(() => {
    if (!fileuri) {
      router.navigate("/");
      return;
    }

    const processFile = async () => {
      try {
        setIsLoading(true);
        const inputFile = new fs.File(fileuri);
        const wavFile = await toWav(inputFile);
        setTempFile(wavFile);
      } catch (error) {
        console.error("Error converting file to WAV:", error);
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    processFile();
  }, [fileuri, router]);

  const handleDenoise = async () => {
    if (!tempFile) return;

    setDenoising(true);
    setProgress(0);
    setProgressText("Initializing...");

    try {
      setProgressText("Converting to PCM...");
      const pcmFile = await WavtoPCM(tempFile);

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
      const denoisedArray = await denoiser.denoise(float32Array, (p) => {
        setProgress(p);
      });

      setProgressText("Saving denoised audio...");
      const denoisedPcmFile = await ArraytoPCM(denoisedArray);

      setProgressText("Finalizing...");
      const finalWavFile = await PCMtoWav(denoisedPcmFile);
      setDenoisedFile(finalWavFile);
    } catch (error) {
      console.error("Error during denoising:", error);
    } finally {
      setDenoising(false);
      setProgressText("");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[theme.Styles.container, theme.Styles.centered]}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
        <Text style={styles.loadingText}>Preparing audio...</Text>
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
        <Text style={theme.Styles.title}>Process Audio</Text>
      </View>

      <View style={styles.content}>
        <View style={theme.Styles.card}>
          <Text style={styles.sectionTitle}>Original Audio</Text>
          <View style={styles.playerContainer}>
            {tempFile && <AudioPlayer uri={tempFile.uri} />}
          </View>
        </View>

        {denoising && (
          <View style={[theme.Styles.card, styles.progressCard]}>
            <Text style={styles.progressLabel}>{progressText}</Text>
            <View style={styles.progressInfo}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
          </View>
        )}

        {denoisedFile && (
          <View style={[styles.resultCard]}>
            <View style={theme.Styles.row}>
              <Feather name="check-circle" size={20} color={theme.COLORS.success} />
              <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Denoised Result</Text>
            </View>
            <View style={styles.playerContainer}>
              <AudioPlayer uri={denoisedFile.uri} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!denoisedFile ? (
          <TouchableOpacity
            style={[
              theme.Styles.button,
              denoising && theme.Styles.disabledButton,
              { width: '100%' }
            ]}
            onPress={handleDenoise}
            disabled={denoising}
          >
            {denoising ? (
              <ActivityIndicator color={theme.COLORS.background} style={{ marginRight: 10 }} />
            ) : (
              <Feather name="zap" size={20} color={theme.COLORS.background} style={{ marginRight: 10 }} />
            )}
            <Text style={theme.Styles.buttonText}>
              {denoising ? "Processing..." : "Start Denoising"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[theme.Styles.button, { width: '100%' }]}
            onPress={() => router.replace("/")}
          >
            <Feather name="refresh-cw" size={20} color={theme.COLORS.background} style={{ marginRight: 10 }} />
            <Text style={theme.Styles.buttonText}>Process Another File</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 0,
    top: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  headerContainer: {
    marginTop: theme.SPACING.xsmall,
    fontSize: theme.FONT_SIZE.heading,
  },
  sectionTitle: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    color: theme.COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  progressLabel: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    marginBottom: 12,
    fontWeight: '600',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
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
  resultCard: {
    borderColor: theme.COLORS.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
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
  },
});
