import * as theme from "@/src/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
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
  State,
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
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const progressBarWidth = Dimensions.get("window").width * 0.6;
  const progress = useSharedValue(0);
  const isSeeking = useSharedValue(false);
  // const translationX = useSharedValue(0);
  const pan = Gesture.Pan()
    .onBegin(() => {
      isSeeking.value = true;
      // translationX.value = e.absoluteX;
      // setIsPlaying(false);
    })
    .onChange((event: any) => {
      // Should be the actual width of the progress bar
      // translationX.value += event.translationX;
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
      // setIsPlaying(true);
    })
    .runOnJS(true);
  useEffect(() => {
    const loadSound = async () => {
      if (!uri) return;
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
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
      setDuration(status.durationMillis);
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

  const formatTime = (millis: number | null) => {
    if (millis === null) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? "0" : ""}${seconds}`;
  };

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      isSeeking.value = true;
    }
    if (event.nativeEvent.state === State.END) {
      isSeeking.value = false;
      if (sound && duration) {
        const newPosition = progress.value * duration;
        sound.setPositionAsync(newPosition);
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ height: 200 }}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={40}
            color={theme.COLORS.primary}
            /*  style={theme.Styles.icon} */
          />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <GestureDetector gesture={pan}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progress, animatedProgressStyle]} />
            </View>
          </GestureDetector>
          <Text
            style={[
              styles.timeText,
              {
                /* marginRight: 20 */
              },
            ]}
          >
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    /* flex: 1, */
    flexDirection: "row",
    // alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#112224ff",
    paddingVertical: theme.SPACING.small,
    paddingHorizontal: theme.SPACING.large,
    borderRadius: 30,
  },
  playButton: {
    marginLeft: 0,
    marginRight: -12,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  timeText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.xsmall,
    marginHorizontal: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.COLORS.secondary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    backgroundColor: theme.COLORS.primary,
    borderRadius: 4,
  },
});

export default AudioPlayer;
