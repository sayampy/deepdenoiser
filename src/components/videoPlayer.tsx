import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface VideoPlayerProps {
  uri: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filename from URI
  const fileName = uri.split("/").pop() || "Video";

  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = false;
    // player.showNowPlayingNotification = true;r
    // player.play();
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleShare = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.videoContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={48} color={theme.COLORS.error} />
            <Text style={styles.errorText}>Failed to load video</Text>
          </View>
        ) : (
          <VideoView
            style={styles.video}
            player={player}
            fullscreenOptions={{ enable: true }}
            contentFit="contain"
          />
        )}
        {isLoading && !error && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={theme.COLORS.primary} size="large" />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
        </View>

        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Feather name="external-link" size={18} color={theme.COLORS.background} />
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    overflow: "hidden",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: theme.COLORS.error,
    marginTop: 10,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.SPACING.medium,
    backgroundColor: theme.COLORS.surface,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.xsmall,
    marginTop: 2,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  buttonText: {
    color: theme.COLORS.background,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "700",
  },
});

export default VideoPlayer;
