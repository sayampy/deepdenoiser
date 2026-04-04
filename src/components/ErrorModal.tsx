import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface ErrorModalProps {
  visible: boolean;
  error: Error | null;
  onClose: () => void;
}

export default function ErrorModal({ visible, error, onClose }: ErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const interpretError = (err: Error) => {
    const msg = err.message.toLowerCase();
    const stack = err.stack?.toLowerCase() || "";
    if (msg.includes("out of memory") || msg.includes("allocation failed") || stack.includes("outofmemory")) {
      return {
        title: "Out of Memory",
        description: "Your device ran out of RAM. This usually happens with very large files. Try closing other apps or processing a shorter clip.",
        icon: "cpu" as const,
      };
    }
    if (msg.includes("no audio track") || stack.includes("no audio track")) {
      return {
        title: "No Audio Track Found",
        description: "Make sure the file is not corrupted and has an audio track",
        icon: "mic-off" as const,
      };
    }
    if (msg.includes("illegal character") || stack.includes("illegal character")) {
      return {
        title: "Illegal Character in Filename",
        description: "rename the file with a valid filename without any ascii symbols",
        icon: "file" as const,
      };
    }

    if (msg.includes("decoder") || msg.includes("mediacodec") || msg.includes("transcode failed") || msg.includes("format")) {
      return {
        title: "Media Decoding Failed",
        description: "Your device's hardware (MediaCodec) couldn't process this file format or resolution. Try a different file format (like .mp3 or .mp4).",
        icon: "video-off" as const,
      };
    }

    if (msg.includes("onnx") || msg.includes("session") || msg.includes("model")) {
      return {
        title: "AI Model Error",
        description: "The denoising model failed to initialize or run. This might be due to incompatible hardware acceleration.",
        icon: "activity" as const,
      };
    }

    if (msg.includes("permission") && msg.includes("denied")) {
      return {
        title: "Permission Denied",
        description: "The app doesn't have permission to access your files. Please check your app settings.",
        icon: "lock" as const,
      };
    }

    return {
      title: "Something Went Wrong",
      description: "An unexpected error occurred during processing. See details below for more information.",
      icon: "alert-circle" as const,
    };
  };

  const interpretation = interpretError(error);

  const copyToClipboard = async () => {
    const textToCopy = `Error: ${error.message}\n\nStack: ${error.stack}`;
    await Clipboard.setStringAsync(textToCopy);
  };

  const submitToGithub = () => {
    const title = encodeURIComponent(`[Bug]: ${interpretation.title}`);
    const body = encodeURIComponent(
      `**Interpreted Error:**\n${interpretation.title}: ${interpretation.description}\n\n` +
      `**Stack Trace:** (Paste Error Details)\n\n` +
      `**Device Info:**\n(Please add your device model,RAM size and OS version here)`
    );
    const url = `https://github.com/sayampy/deepdenoiser/issues/new?title=${title}&body=${body}`;
    Linking.openURL(url);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.COLORS.error + "20" }]}>
              <Feather name={interpretation.icon} size={28} color={theme.COLORS.error} />
            </View>
            <Text style={styles.modalTitle}>{interpretation.title}</Text>
          </View>

          <Text style={styles.description}>{interpretation.description}</Text>

          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.detailsToggleText}>
              {showDetails ? "Hide technical details" : "Show technical details"}
            </Text>
            <Feather
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.COLORS.subtext}
            />
          </TouchableOpacity>

          {showDetails && (
            <View style={styles.errorContainer}>
              <ScrollView style={styles.errorScrollView} nestedScrollEnabled={true}>
                <Text style={styles.errorText}>{error.message}</Text>
                {error.stack && (
                  <Text style={[styles.errorText, { marginTop: 8, opacity: 0.7 }]}>
                    {error.stack}
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            <Feather name="copy" size={16} color={theme.COLORS.primary} />
            <Text style={styles.copyButtonText}>Copy Error Details</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.githubHint}>
            If you think it is a problem in the app, not your device:
          </Text>

          <TouchableOpacity style={styles.githubButton} onPress={submitToGithub}>
            <Feather name="github" size={20} color={theme.COLORS.background} />
            <Text style={styles.githubButtonText}>Report on GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              theme.Styles.button,
              theme.Styles.buttonSecondary,
              styles.closeButton,
            ]}
            onPress={onClose}
          >
            <Text style={[theme.Styles.buttonText, theme.Styles.buttonTextSecondary]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: theme.COLORS.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "700",
    color: theme.COLORS.text,
    flex: 1,
  },
  description: {
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.subtext,
    lineHeight: 22,
    marginBottom: 20,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  detailsToggleText: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#00000040",
    borderRadius: 12,
    padding: 12,
    maxHeight: 150,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  errorScrollView: {
    flexGrow: 0,
  },
  errorText: {
    fontSize: 12,
    fontFamily: theme.FONTS?.mono || "monospace",
    color: "#FFAAAA",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    alignSelf: "center",
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.primary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: theme.COLORS.border,
    width: "100%",
    marginBottom: 16,
  },
  githubHint: {
    fontSize: theme.FONT_SIZE.xsmall,
    color: theme.COLORS.subtext,
    textAlign: "center",
    marginBottom: 12,
    fontStyle: "italic",
  },
  githubButton: {
    flexDirection: "row",
    backgroundColor: theme.COLORS.text,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  githubButtonText: {
    color: theme.COLORS.background,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
  },
  closeButton: {
    width: "100%",
    height: 48,
  },
});
