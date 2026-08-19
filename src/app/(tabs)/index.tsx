import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import { importToDocuments, cleanupTempCache } from "@/src/scripts/denoiseCache";
import Feather from "@expo/vector-icons/Feather";

import * as DocumentPicker from "expo-document-picker";
import * as fs from "expo-file-system";
import { useRouter } from "expo-router";
import { Host, LoadingIndicator } from "@expo/ui/jetpack-compose";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
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

  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  useEffect(() => {
    // Remove only this app's leftover temp PCM/encode artifacts.
    // NEVER wipe the whole cache — that deleted the expo-document-picker
    // working copy out from under users mid-flow (ENOENT crash reports).
    cleanupTempCache();
  }, []);

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
        // Copy the picked file out of the evictable cache into app documents
        // so a cache purge (or the system) can't remove it mid-processing.
        const imported = await importToDocuments(asset.uri, asset.name);
        // The cache/DocumentPicker copy is no longer needed.
        try {
          new fs.File(asset.uri).delete();
        } catch {
          // Ignore — the copy may already be gone or un-deletable.
        }
        setTempFile({
          uri: imported.uri,
          name: asset.name,
          type: asset.mimeType?.startsWith("audio") ? "Audio" : "Video",
        });
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error importing file:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsErrorModalVisible(true);
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
        fileuri: encodeURIComponent(tempFile.uri),
        filename: encodeURIComponent(tempFile.name),
      },
    });
  };

  return (
    <SafeAreaView style={theme.Styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={theme.Styles.header}>
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={styles.logo}
          />
          <Text style={theme.Styles.title}>DeepDenoiser</Text>
          <Text style={theme.Styles.subtitle}>
            Remove background noise from your audio and video using DeepFilterNet 3
          </Text>
        </View>

        <View style={styles.mainContent}>
          {!tempFile ? (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: theme.COLORS.primary }]}
                onPress={handleImportFile}
              >
                <View style={[styles.iconWrapper, { backgroundColor: "rgba(0, 229, 255, 0.1)" }]}>
                  <Feather
                    name="upload-cloud"
                    size={32}
                    color={theme.COLORS.primary}
                  />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Import File</Text>
                  <Text style={styles.actionSubtitle}>
                    Audio or Video from your device
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.COLORS.border} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: theme.COLORS.error }]}
                onPress={() => router.push("/recording")}
              >
                <View style={[styles.iconWrapper, { backgroundColor: "rgba(255, 61, 0, 0.1)" }]}>
                  <Feather
                    name="mic"
                    size={32}
                    color={theme.COLORS.error}
                  />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: theme.COLORS.error }]}>Record Voice</Text>
                  <Text style={styles.actionSubtitle}>
                    Real-time denoising for recordings
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.COLORS.border} />
              </TouchableOpacity>

              {/* <View style={styles.infoBox}>
                <Feather name="info" size={16} color={theme.COLORS.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoText}>
                  Uses DeepFilterNet 3 model for high-quality background noise removal.
                </Text>
              </View> */}
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Selected File</Text>
                <TouchableOpacity
                  onPress={() => setTempFile(null)}
                  style={styles.removeBadge}
                >
                  <Feather name="x" size={14} color={theme.COLORS.white} />
                  <Text style={styles.removeBadgeText}>Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fileDetails}>
                {tempFile.type === "Video" ? (
                  <VideoPlayer uri={tempFile.uri} name={tempFile.name} />
                ) : (
                  <View style={theme.Styles.card}>
                    <AudioPlayer uri={tempFile.uri} name={tempFile.name} />
                  </View>
                )}
              </View>
            </View>
          )}

          {isLoading && (
            <View style={styles.loaderContainer}>
              <Host matchContents colorScheme="dark">
                <LoadingIndicator color={theme.COLORS.primary} />
              </Host>
              <Text style={styles.loaderText}>Processing asset...</Text>
            </View>
          )}
        </View>
      </ScrollView>

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

      <ErrorModal
        visible={isErrorModalVisible}
        error={error}
        onClose={() => setIsErrorModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.SPACING.xxlarge,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  logo: {
    width: 60,
    height: 60,
  },
  mainContent: {
    flex: 1,
    marginTop: theme.SPACING.medium,
  },
  actionsContainer: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "800",
    marginBottom: 4,
  },
  actionSubtitle: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 229, 255, 0.05)",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    alignItems: "center",
  },
  infoText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.xsmall,
    flex: 1,
    lineHeight: 18,
  },
  previewContainer: {
    width: "100%",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  previewTitle: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  removeBadge: {
    flexDirection: "row",
    backgroundColor: theme.COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    gap: 4,
  },
  removeBadgeText: {
    color: theme.COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  fileDetails: {
    width: "100%",
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  loaderText: {
    color: theme.COLORS.subtext,
    marginTop: 12,
    fontSize: theme.FONT_SIZE.small,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.SPACING.medium,
    paddingBottom: theme.SPACING.xlarge,
    backgroundColor: theme.COLORS.background,
  },
});
