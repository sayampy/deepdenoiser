import * as theme from "@/src/constants/theme";
import { File } from "expo-file-system";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import {
  StyleSheet,
  Text,
  View
} from "react-native";


interface VideoPlayerProps {
  uri: string;
  name: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, name }) => {

  // Get filename from URI
  const file = new File(uri);
  const fileName = file.name;

  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = false;
    // player.showNowPlayingNotification = true;r
    // player.play();
  });
  return (
    <View style={styles.card}>
      <View style={styles.videoContainer}>

        <VideoView
          style={styles.video}
          player={player}
          fullscreenOptions={{ enable: true }}
          contentFit="contain"
        />

      </View>

      <View style={styles.footer}>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{name.replaceAll('%20', '\s')}</Text>

        </View>
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

});

export default VideoPlayer;
