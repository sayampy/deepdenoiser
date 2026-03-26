import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File } from "expo-file-system";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface AudioPlayerProps {
  uri: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri }) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const progressBarWidth = Dimensions.get("window").width * 0.5;
  const progress = useSharedValue(0);
  const isSeeking = useSharedValue(false);

  // Get filename from URI
  const file = new File(uri);
  const fileName = file.name;

  const pan = Gesture.Pan()
    .onBegin(() => {
      isSeeking.value = true;
    })
    .onChange((event: any) => {
      const newProgress =
        (progress.value * progressBarWidth + event.changeX) / progressBarWidth;
      progress.value = Math.max(0, Math.min(1, newProgress));
    })
    .onFinalize(() => {
      isSeeking.value = false;
      if (player && status.duration) {
        const newPosition = progress.value * status.duration;
        player.seekTo(newPosition);
      }
    })
    .runOnJS(true);

  useEffect(() => {
    if (!isSeeking.value && status.duration > 0) {
      progress.value = status.currentTime / status.duration;
    }
  }, [status.currentTime, status.duration, isSeeking.value]);

  useEffect(() => {
    if (status.currentTime >= status.duration && status.duration > 0 && !status.playing) {
      player.seekTo(0);
      progress.value = 0;
    }
  }, [status.currentTime, status.duration, status.playing]);

  const handlePlayPause = () => {
    if (!player) return;
    if (status.playing) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${minutes}:${s < 10 ? "0" : ""}${s}`;
  };

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View>
      <GestureHandlerRootView style={styles.audioContainer}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <View style={styles.iconCircle}>
            <Feather
              name={status.playing ? "pause" : "play"}
              size={24}
              color={theme.COLORS.background}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.controlsContainer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(status.duration)}</Text>
          </View>

          <GestureDetector gesture={pan}>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progress, animatedProgressStyle]} />
              </View>
            </View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
      <View
        style={{
          height: 1,
          backgroundColor: theme.COLORS.border,
        }}
      />

      <View style={styles.footer}>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.COLORS.surface,
    // borderRadius: 24,
    // borderWidth: 1,
    // borderColor: theme.COLORS.border,
    overflow: "hidden",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.SPACING.small,
    paddingHorizontal: theme.SPACING.xsmall,
  },
  playButton: {
    marginRight: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsContainer: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.xsmall,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 20,
    justifyContent: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    backgroundColor: theme.COLORS.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.SPACING.small,
    paddingHorizontal: theme.SPACING.xsmall,
    backgroundColor: theme.COLORS.surface,
  },
  infoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
  },
});

export default AudioPlayer;

