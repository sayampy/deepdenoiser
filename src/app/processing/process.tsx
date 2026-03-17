import AudioPlayer from "@/src/components/audioPlayer";
import { SPACING, Styles } from "@/src/constants/theme";
import { WavtoPCM, toWav, PCMtoWav } from "@/src/scripts/formatHandler";
import * as fs from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Asset } from "expo-asset";


import { DeepFilterNet } from "@/src/scripts/Denoiser";


export default function ProcessScreen() {
  const router = useRouter();
  const { fileuri } = useLocalSearchParams<{ fileuri: string }>();
  const [tempFile, setTempFile] = useState<fs.File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [denoising, setDenoising] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [denoisedFile, setDenoisedFile] = useState<fs.File | null>(
    null,
  );

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
      // 1. Convert WAV to PCM
      setProgressText("Converting to PCM...");
      const pcmFile = await WavtoPCM(tempFile);

      // 2. Read PCM and convert to Float32Array
      setProgressText("Reading audio data...");
      const pcmDataB64 = await pcmFile.base64();
      const pcmData = atob(pcmDataB64);
      const pcmArray = new Int16Array(
        pcmData.split("").map((c) => c.charCodeAt(0)),
      );
      const float32Array = new Float32Array(pcmArray.length);
      for (let i = 0; i < pcmArray.length; i++) {
        float32Array[i] = pcmArray[i] / 32768.0;
      }

      // 3. Denoise
      setProgressText("Loading model...");
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

      // 4. Convert Float32Array back to PCM
      setProgressText("Saving denoised audio...");
      const denoisedPcmArray = new Int16Array(denoisedArray.length);
      for (let i = 0; i < denoisedArray.length; i++) {
        denoisedPcmArray[i] = Math.max(
          -32768,
          Math.min(32767, Math.floor(denoisedArray[i] * 32768.0)),
        );
      }
      const denoisedPcmData = String.fromCharCode.apply(
        null,
        Array.from(new Uint8Array(denoisedPcmArray.buffer)),
      );
      const denoisedPcmB64 = btoa(denoisedPcmData);
      const denoisedPcmFile = new fs.File(
        fs.Paths.cache,
        "denoised_output.pcm",
      );
      await denoisedPcmFile.write(denoisedPcmB64);

      // 5. Convert PCM to WAV
      setProgressText("Finalizing...");
      const finalWavFile = await PCMtoWav(
        denoisedPcmFile
      );
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
      <View style={[Styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2271e0ff" />
        <Text style={styles.loadingText}>Processing audio...</Text>
      </View>
    );
  }

  return (
    <View style={[Styles.container]}>
      <Text style={[Styles.header, Styles.title, { marginVertical: 15 }]}>
        Ready to Process
      </Text>
      <View style={{ marginTop: 15, marginBottom: 20 }}>
        {tempFile && <AudioPlayer uri={tempFile.uri} />}
      </View>

      {denoising && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{`${progressText} ${progress}%`}</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}
      {denoisedFile && (
        <View style={{ marginTop: 15, marginBottom: 20 }}>
          <Text style={styles.subtitle}>Denoised Audio</Text>
          <AudioPlayer uri={denoisedFile.uri} />
        </View>
      )}
      <TouchableOpacity
        style={[
          Styles.button,
          {
            width: "60%",
            paddingVertical: SPACING.small,
            paddingHorizontal: SPACING.medium,
            marginBottom: 10,
          },
          denoising && styles.disabledButton,
        ]}
        onPress={handleDenoise}
        disabled={denoising}
      >
        <Text style={Styles.buttonText}>Start Denoising</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          Styles.button,
          {
            width: "60%",
            paddingVertical: SPACING.small,
            paddingHorizontal: SPACING.medium,
            marginBottom: 20,
            backgroundColor: "#777",
          },
        ]}
        onPress={() => router.back()}
      >
        <Text style={Styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#383b3eff",
  },
  title: {
    color: "black",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#383b3eff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  progressContainer: {
    width: "80%",
    marginVertical: 20,
    alignItems: "center",
  },
  progressText: {
    color: "#383b3eff",
    fontSize: 14,
    marginBottom: 5,
  },
  progressBarBackground: {
    width: "100%",
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2271e0ff",
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: "#aaa",
  },
  btn: {
    backgroundColor: "#2271e0ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "center",
    minWidth: 160,
  },
  pressed: { opacity: 0.9 },
  btnText: { color: "black", fontWeight: "700" },
});
