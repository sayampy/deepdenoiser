import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
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
      if (sound && duration) {
        const newPosition = progress.value * duration;
        sound.setPositionAsync(newPosition);
      }
    })
    .runOnJS(true);

  useEffect(() => {
    const loadSound = async () => {
      if (!uri) return;
      try {
        const { sound } = await Audio.Sound.createAsync({ uri });
        setSound(sound);
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
        }
      } catch (error) {
        console.error("Error loading sound:", error);
      }
    };

    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [uri]);

  useEffect(() => {
    if (sound) {
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    }
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      if (!isSeeking.value) {
        progress.value = status.positionMillis / (status.durationMillis || 1);
      }
      if (status.didJustFinish) {
        setIsPlaying(false);
        sound?.stopAsync();
        sound?.setPositionAsync(0);
        progress.value = 0;
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
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
              name={isPlaying ? "pause" : "play"}
              size={24}
              color={theme.COLORS.background}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.controlsContainer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
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

