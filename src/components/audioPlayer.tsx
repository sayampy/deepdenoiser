import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useCallback, useEffect } from "react";
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface AudioPlayerProps {
  uri: string;
  name: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri, name }) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const trackWidth = useSharedValue(0);
  const progress = useSharedValue(0);
  const isSeeking = useSharedValue(false);

  useFocusEffect(useCallback(() => {
    return () => {
      try {
        if (player && player?.playing) {
          player?.pause();
          player?.release();
        };
      } catch (error) {
        console.warn(error);
      }
    };
  }, [player]));

  const pan = Gesture.Pan()
    .onBegin(() => {
      isSeeking.value = true;
    })
    .onChange((event) => {
      if (trackWidth.value <= 0) return;
      const change = event.changeX / trackWidth.value;
      progress.value = Math.max(0, Math.min(1, progress.value + change));
    })
    .onFinalize(() => {
      isSeeking.value = false;
      const finalProgress = progress.value;
      runOnJS(() => {
        if (player && status.duration) {
          player.seekTo(finalProgress * status.duration);
        }
      })();
    });

  useEffect(() => {
    if (!isSeeking.value && status.duration > 0) {
      progress.value = status.currentTime / status.duration;
    }
  }, [status.currentTime, status.duration, isSeeking.value]);

  useEffect(() => {
    if (status.currentTime >= status.duration && status.duration > 0 && !status.playing) {
      player.seekTo(0);
      progress.value = 0;
      player.pause();
    }
  }, [status.currentTime, status.duration, status.playing, player]);

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

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const animatedKnobStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 100}%`,
    transform: [{ scale: isSeeking.value ? 1.2 : 1 }]
  }));

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={styles.audioControls}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <View style={styles.iconCircle}>
            <Feather
              name={status.playing ? "pause" : "play"}
              size={24}
              color={theme.COLORS.background}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.sliderSection}>
          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(status.duration)}</Text>
          </View>

          <GestureDetector gesture={pan}>
            <View 
              style={styles.trackContainer}
              onLayout={(e) => { trackWidth.value = e.nativeEvent.layout.width; }}
            >
              <View style={styles.track}>
                <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
              </View>
              <Animated.View style={[styles.knob, animatedKnobStyle]} />
            </View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>

      <View style={styles.divider} />

      <View style={styles.fileNameContainer}>
        <Feather name="music" size={14} color={theme.COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={styles.fileName} numberOfLines={1}>
          {name.replaceAll('%20', ' ')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "transparent",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  playButton: {
    marginRight: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderSection: {
    flex: 1,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeText: {
    color: theme.COLORS.subtext,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trackContainer: {
    height: 24,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.COLORS.primary,
  },
  knob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.COLORS.white,
    marginLeft: -7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 4,
  },
  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  fileName: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "600",
    flex: 1,
  },
});

export default AudioPlayer;
