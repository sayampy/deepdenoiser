import AudioPlayer from "@/src/components/audioPlayer";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
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
  const [tempFile, setTempFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImportFile = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "video/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        setIsLoading(true);
        const asset = result.assets[0];
        setTempFile({
          uri: asset.uri,
          name: asset.name,
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
      params: { fileuri: tempFile.uri },
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
          <View style={[theme.Styles.card, styles.fileCard]}>
            {/* <View style={styles.fileIconContainer}>
              <Feather
                name={tempFile.type === "Audio" ? "music" : "video"}
                size={32}
                color={theme.COLORS.primary}
                />
                </View>
                <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                {tempFile.name}
                </Text>
                <Text style={styles.fileType}>{tempFile.type} File</Text>
                </View> */}
            <View style={styles.fileDetails}>
              {tempFile && (
                tempFile.type === "Video" ? (
                  <VideoPlayer uri={tempFile.uri} />
                ) : (
                  <AudioPlayer uri={tempFile.uri} />
                )
              )}
            </View>
            <TouchableOpacity
              onPress={() => setTempFile(null)}
              style={styles.removeButton}
            >
              <Feather name="trash-2" size={20} color={theme.COLORS.error} />
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
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // padding: theme.SPACING.xsmall,
  },
  fileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileDetails: {
    // marginLeft: 16,
    flex: 1,
  },
  fileName: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "600",
    color: theme.COLORS.text,
  },
  fileType: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
    marginTop: 2,
  },
  removeButton: {
    // padding: 4,
    marginLeft: 8,
  },
  loader: {
    marginTop: 24,
  },
  footer: {
    marginBottom: theme.SPACING.xlarge,
  },
});
