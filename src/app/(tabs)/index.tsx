import AudioPlayer from "@/src/components/audioPlayer";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";

import * as DocumentPicker from "expo-document-picker";
import * as fs from "expo-file-system";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [tempFile, setTempFile] = useState<{
    uri: string;
    name: string;
    type: "Audio" | "Video";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    //Clears Cache
    const cache = new fs.Directory(fs.Paths.cache);
    cache.list().forEach((file) => {
      file.delete();
    });
  },
    []);
  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "video/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        setIsLoading(true);
        const asset = result.assets[0];
        const asset_file = new File(asset.uri);
        const filename = asset.name;
        // asset_file.rename(asset.name);
        setTempFile({
          uri: asset_file.uri,
          name: filename,
          type: asset.mimeType?.startsWith("audio") ? "Audio" : "Video",
        });
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert(
        "Error",
        "An unexpected error occurred while importing the file.",
      );
      console.error("Error importing file:", error);
    }
  };

  const handleProceed = () => {
    if (!tempFile) {
      Alert.alert("No File", "Please import a file before proceeding.");
      return;
    }
    router.push({
      pathname: "/processing/process",
      params: {
        fileuri: tempFile.uri,
        filename: tempFile.name,
      },
    });
  };

  return (
    <SafeAreaView style={theme.Styles.container}>
      <StatusBar style="light" />
      <View style={theme.Styles.header}>
        <Feather
          name="mic"
          size={48}
          color={theme.COLORS.primary}
          style={{ marginBottom: 16 }}
        />
        <Text style={theme.Styles.title}>DeepDenoiser</Text>
        <Text style={theme.Styles.subtitle}>
          Remove background noise from your audio and video using DeepFilterNet
          3
        </Text>
      </View>

      <View style={styles.mainContent}>
        {!tempFile ? (
          <TouchableOpacity
            style={[
              theme.Styles.card,
              styles.importCard,
              { borderStyle: "dashed" },
            ]}
            onPress={handleImportFile}
          >
            <Feather
              name="upload-cloud"
              size={40}
              color={theme.COLORS.primary}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.importTitle}>Import Media File</Text>
            <Text style={styles.importSubtitle}>
              Tap to browse audio or video
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.previewContainer}>
            <View style={styles.fileDetails}>
              {tempFile.type === "Video" ? (
                <VideoPlayer uri={tempFile.uri} name={tempFile.name} />
              ) : (
                <View style={theme.Styles.card}>
                  <AudioPlayer uri={tempFile.uri} name={tempFile.name} />
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setTempFile(null)}
              style={styles.removeButton}
            >
              <Feather name="trash-2" size={20} color={theme.COLORS.error} />
              <Text style={styles.removeText}>Remove File</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <ActivityIndicator
            size="large"
            color={theme.COLORS.primary}
            style={styles.loader}
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            theme.Styles.button,
            !tempFile && theme.Styles.disabledButton,
            { width: "100%" },
          ]}
          onPress={handleProceed}
          disabled={!tempFile || isLoading}
        >
          <Text style={theme.Styles.buttonText}>Proceed to Denoise</Text>
          <Feather
            name="arrow-right"
            size={20}
            color={theme.COLORS.background}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  importCard: {
    alignItems: "center",
    paddingVertical: 48,
    backgroundColor: "rgba(0, 229, 255, 0.05)",
  },
  importTitle: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "700",
  },
  importSubtitle: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.body,
    marginTop: 4,
  },
  previewContainer: {
    width: "100%",
  },
  fileDetails: {
    width: "100%",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 8,
  },
  removeText: {
    color: theme.COLORS.error,
    marginLeft: 8,
    fontWeight: "600",
    fontSize: theme.FONT_SIZE.small,
  },
  loader: {
    marginTop: 24,
  },
  footer: {
    marginBottom: theme.SPACING.xlarge,
  },
});
