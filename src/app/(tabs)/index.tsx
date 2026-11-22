import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import { importToDocuments, cleanupTempCache } from "@/src/scripts/denoiseCache";
import { AppSettings, getSettings } from "@/src/scripts/settings";
import { getSaveDirectoryName } from "@/src/scripts/saveDestinations";
import Feather from "@expo/vector-icons/Feather";

import * as DocumentPicker from "expo-document-picker";
import * as fs from "expo-file-system";
import { useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { Host, LoadingIndicator } from "@expo/ui/jetpack-compose";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { useStyles } from "@/src/hooks/useStyles";

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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { colorScheme } = useTheme();
  const styles = useStyles(makeStyles);

  const refreshState = async () => {
    try {
      setSettings(await getSettings());
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    void refreshState();
  }, []);

  const {
    resolvedSharedPayloads,
    isResolving: isShareResolving,
    clearSharedPayloads,
    error: shareError,
  } = useIncomingShare();
  const shareHandledRef = useRef(false);

  useEffect(() => {
    if (shareHandledRef.current || isShareResolving) return;
    if (resolvedSharedPayloads.length === 0 && !shareError) return;

    if (shareError) {
      console.error("Error resolving shared payload:", shareError);
      shareHandledRef.current = true;
      return;
    }

    const payload = resolvedSharedPayloads[0];
    if (!payload?.contentUri) {
      shareHandledRef.current = true;
      return;
    }

    shareHandledRef.current = true;
    (async () => {
      try {
        setIsLoading(true);
        const imported = await importToDocuments(
          payload.contentUri!,
          payload.originalName ?? "shared_file",
          payload.value,
        );
        clearSharedPayloads();
        router.push({
          pathname: "/processing/process",
          params: {
            fileuri: encodeURIComponent(imported.uri),
            filename: encodeURIComponent(payload.originalName ?? "shared_file"),
          },
        });
      } catch (copyErr) {
        setIsLoading(false);
        const err =
          copyErr instanceof Error ? copyErr : new Error(String(copyErr));
        console.error("Failed to import shared file:", err);
        setError(err);
        setIsErrorModalVisible(true);
        clearSharedPayloads();
      }
    })();
  }, [resolvedSharedPayloads, isShareResolving, shareError, clearSharedPayloads, router]);

  useEffect(() => {
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
        const imported = await importToDocuments(asset.uri, asset.name);
        try {
          new fs.File(asset.uri).delete();
        } catch {
          // ignore
        }
        setTempFile({
          uri: imported.uri,
          name: asset.name,
          type: asset.mimeType?.startsWith("audio") ? "Audio" : "Video",
        });
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setIsErrorModalVisible(true);
    }
  };

  const handleProceed = () => {
    if (!tempFile) {
      Alert.alert("No file", "Please select a file to continue.");
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

  const saveDirName = settings ? getSaveDirectoryName(settings.saveDirectoryUri) : null;
  const audioFormatLabel = settings?.exportFormat === "mp3"
    ? `MP3 (${settings.mp3Bitrate ?? 128}k)`
    : settings?.exportFormat === "m4a"
      ? `M4A (${settings.m4aBitrate ?? 192}k)`
      : "WAV (Lossless)";
  const videoFormatLabel = (settings?.videoExportFormat ?? "original") === "compressed"
    ? "Compressed MP4"
    : "Original Video";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Clean Top Bar: Title */}
      <View style={styles.topAppBar}>
        <Text style={styles.appTitle}>DeepDenoiser</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {!tempFile ? (
            <View style={styles.actionGroup}>
              {/* Option 1: Choose File */}
              <TouchableOpacity
                style={styles.card}
                onPress={handleImportFile}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <Feather name="folder" size={24} color={theme.COLORS.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>Choose audio or video</Text>
                  <Text style={styles.cardSubtitle}>
                    Select a recording, voice note, podcast, or video from your device
                  </Text>
                </View>
                <Feather name="arrow-right" size={20} color={theme.COLORS.subtext} />
              </TouchableOpacity>

              {/* Option 2: Record Audio */}
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push("/recording")}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, styles.micCircle]}>
                  <Feather name="mic" size={24} color={theme.COLORS.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>Record audio</Text>
                  <Text style={styles.cardSubtitle}>
                    Capture voice with live neural background noise suppression
                  </Text>
                </View>
                <Feather name="arrow-right" size={20} color={theme.COLORS.subtext} />
              </TouchableOpacity>

              {/* Active Pipeline Configuration Summary */}
              <View style={styles.configCard}>
                <Text style={styles.configHeaderTitle}>Export & Output Settings</Text>
                <View style={styles.configRowsContainer}>
                  <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Audio Format</Text>
                    <Text style={styles.configValue}>{audioFormatLabel}</Text>
                  </View>
                  <View style={styles.configDivider} />
                  <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Video Format</Text>
                    <Text style={styles.configValue}>{videoFormatLabel}</Text>
                  </View>
                  <View style={styles.configDivider} />
                  <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Destination</Text>
                    <Text style={styles.configValue} numberOfLines={1}>
                      {saveDirName ?? "System Media Gallery"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Selected {tempFile.type}</Text>
                <TouchableOpacity
                  onPress={() => setTempFile(null)}
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.previewCard}>
                {tempFile.type === "Video" ? (
                  <VideoPlayer uri={tempFile.uri} name={tempFile.name} />
                ) : (
                  <AudioPlayer uri={tempFile.uri} name={tempFile.name} />
                )}
              </View>
            </View>
          )}

          {isLoading && (
            <View style={styles.loaderContainer}>
              <Host matchContents colorScheme={colorScheme}>
                <LoadingIndicator color={theme.COLORS.primary} />
              </Host>
              <Text style={styles.loaderText}>Opening file...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Continue Button when a file is selected */}
      {tempFile && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceed}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedButtonText}>Continue to Denoise</Text>
            <Feather name="arrow-right" size={18} color={theme.COLORS.background} />
          </TouchableOpacity>
        </View>
      )}

      <ErrorModal
        visible={isErrorModalVisible}
        error={error}
        onClose={() => setIsErrorModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
  },
  topAppBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.background,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.COLORS.text,
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  mainContent: {
    flex: 1,
  },
  actionGroup: {
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.COLORS.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  micCircle: {
    backgroundColor: theme.COLORS.surfaceContainerHigh,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.COLORS.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.COLORS.subtext,
    lineHeight: 18,
  },
  configCard: {
    backgroundColor: theme.COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    gap: 12,
  },
  configHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  configRowsContainer: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  configRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  configLabel: {
    fontSize: 13,
    color: theme.COLORS.subtext,
  },
  configValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.COLORS.text,
  },
  configDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.COLORS.border,
  },
  previewContainer: {
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.RADIUS.full,
    backgroundColor: theme.COLORS.surfaceContainerHigh,
  },
  changeBtnText: {
    fontSize: 13,
    color: theme.COLORS.primary,
    fontWeight: "600",
  },
  previewCard: {
    backgroundColor: theme.COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  loaderContainer: {
    alignItems: "center",
    marginTop: 40,
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: theme.COLORS.subtext,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.COLORS.border,
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.COLORS.primary,
    height: 52,
    borderRadius: 16,
  },
  proceedButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.COLORS.background,
  },
});
