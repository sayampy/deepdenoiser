import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStyles } from "@/src/hooks/useStyles";

interface ErrorModalProps {
  visible: boolean;
  error: Error | null;
  onClose: () => void;
}

interface ErrorInterpretation {
  title: string;
  description: string;
  icon: "cpu" | "mic-off" | "file" | "video-off" | "activity" | "lock" | "alert-circle" | "film" | "save";
  /** GitHub issue form that best matches this failure. */
  template: string;
}

const ISSUE_BASE = "https://github.com/sayampy/deepdenoiser/issues/new";

export default function ErrorModal({ visible, error, onClose }: ErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const styles = useStyles(makeStyles);

  if (!error) return null;

  const interpretError = (err: Error): ErrorInterpretation => {
    const msg = err.message.toLowerCase();
    const stack = err.stack?.toLowerCase() || "";

    if (msg.includes("out of memory") || msg.includes("allocation failed") || stack.includes("outofmemory")) {
      return {
        title: "Out of Memory",
        description:
          "Your device ran out of RAM. Close other apps, try a shorter clip, or use the smaller GTCRN model and retry.",
        icon: "cpu",
        template: "crash_performance.yml",
      };
    }
    if (msg.includes("permission") && (msg.includes("denied") || msg.includes("grant"))) {
      return {
        title: "Permission Denied",
        description:
          "Open Android Settings → Apps → DeepDenoiser → Permissions and allow file and microphone access, then try again.",
        icon: "lock",
        template: "bug_report.yml",
      };
    }
    if (msg.includes("no audio track") || msg.includes("no audio stream")) {
      return {
        title: "No Audio Track Found",
        description:
          "This file has no audio stream. Check that the file is complete and not corrupted, then pick a different file.",
        icon: "mic-off",
        template: "media_decoding.yml",
      };
    }
    if (msg.includes("illegal character") || msg.includes("uri syntax")) {
      return {
        title: "Invalid Filename",
        description:
          "The filename contains characters Android cannot open. Rename the file using only letters, numbers, dashes and underscores.",
        icon: "file",
        template: "bug_report.yml",
      };
    }
    if (
      msg.includes("decoder") ||
      msg.includes("mediacodec") ||
      msg.includes("transcode failed") ||
      msg.includes("failed to add the track") ||
      msg.includes("muxer") ||
      msg.includes("format")
    ) {
      return {
        title: "Media Decoding Failed",
        description:
          "This phone's hardware decoder could not handle the file's codec or resolution. Converting it to MP4 (H.264 + AAC) usually fixes this.",
        icon: "video-off",
        template: "media_decoding.yml",
      };
    }
    if (
      msg.includes("sync") ||
      msg.includes("audio starts late") ||
      msg.includes("drift") ||
      msg.includes("length")
    ) {
      return {
        title: "Audio / Video Sync Issue",
        description:
          "The denoised audio did not line up with the video. Note roughly how large the offset was when you report it.",
        icon: "film",
        template: "av_sync_output.yml",
      };
    }
    if (msg.includes("onnx") || msg.includes("session") || msg.includes("model")) {
      return {
        title: "AI Model Error",
        description:
          "The denoising model could not load or run. Try switching models under AI Model, or re-download the model.",
        icon: "activity",
        template: "bug_report.yml",
      };
    }
    if (msg.includes("saving") || msg.includes("gallery") || msg.includes("media library")) {
      return {
        title: "Could Not Save File",
        description:
          "Check that storage permission is granted and that free space is available. You can also choose a custom save folder in Settings.",
        icon: "save",
        template: "bug_report.yml",
      };
    }

    return {
      title: "Something Went Wrong",
      description:
        "An unexpected error occurred. Expand the technical details, copy the diagnostics, and include them in your report.",
      icon: "alert-circle",
      template: "bug_report.yml",
    };
  };

  const interpretation = interpretError(error);

  const diagnostics = () => {
    const version = Constants.expoConfig?.version ?? "unknown";
    return [
      `App version: ${version}`,
      `Android version: ${Platform.Version}`,
      `Error: ${error.message}`,
      error.stack ? `Stack:\n${error.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(diagnostics());
    setCopied(true);
  };

  const submitToGithub = () => {
    const title = encodeURIComponent(`[Bug]: ${interpretation.title}`);
    const body = encodeURIComponent(
      [
        "### What happened?",
        interpretation.description,
        "",
        "### Steps to reproduce",
        "1. ",
        "2. ",
        "",
        "### Diagnostics (copied from the app)",
        "```",
        diagnostics(),
        "```",
        "",
        "### Important",
        "- Search existing issues before submitting.",
        "- Do NOT upload your audio or video files — describe the file instead.",
        "- Include your device model and RAM size.",
      ].join("\n"),
    );
    void Linking.openURL(
      `${ISSUE_BASE}?template=${interpretation.template}&title=${title}&body=${body}`,
    );
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

          <TouchableOpacity style={styles.copyButton} onPress={() => void copyToClipboard()}>
            <Feather name="copy" size={16} color={theme.COLORS.primary} />
            <Text style={styles.copyButtonText}>
              {copied ? "Diagnostics copied" : "Copy diagnostics (for your report)"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.githubHint}>
            If this looks like an app bug, report it with the matching template.{"\n"}
            Include the copied diagnostics and exact steps — never upload your files.
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

const makeStyles = () => StyleSheet.create({
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
    backgroundColor: `${theme.COLORS.border}40`,
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
    color: theme.COLORS.error,
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
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
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
