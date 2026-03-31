import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import {
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
  withSpring,
} from "react-native-reanimated";
import InfoBubble from "./InfoBubble";

interface AdvanceSettingsProps {
  attenLimDb: number;
  onAttenLimDbChange: (value: number) => void;
}

const ALSTEPS = [0, 5, 10, 15, 20, 25];

export default function AdvanceSettings({
  attenLimDb,
  onAttenLimDbChange,
}: AdvanceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sliderWidth = useSharedValue(0);

  // Calculate initial progress based on current attenLimDb
  const initialIndex = ALSTEPS.indexOf(attenLimDb);
  const progress = useSharedValue(initialIndex >= 0 ? initialIndex / (ALSTEPS.length - 1) : 0);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (sliderWidth.value <= 0) return;

      const newProgress = event.x / sliderWidth.value;
      progress.value = Math.max(0, Math.min(1, newProgress));
    })
    .onEnd(() => {
      // Snap to nearest step
      const stepCount = ALSTEPS.length - 1;
      const nearestStep = Math.round(progress.value * stepCount);
      progress.value = withSpring(nearestStep / stepCount);

      // Update parent state
      onAttenLimDbChange(ALSTEPS[nearestStep]);
    })
    .runOnJS(true);

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      left: `${progress.value * 100}%`,
      transform: [{ translateX: -10 }],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <View style={theme.Styles.row}>
          <Feather
            name="settings"
            size={18}
            color={theme.COLORS.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerText}>Advanced Settings</Text>
        </View>
        <Feather
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.COLORS.subtext}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.content}>
          <View style={styles.settingItem}>
            <View style={styles.settingLabelRow}>
              <View style={theme.Styles.row}><Text style={styles.settingLabel}>Attenuation Limit</Text>
                <InfoBubble text={`Higher values preserve more background noise.\n0dB means maximum noise reduction.`}><Feather name="help-circle" size={18} color={theme.COLORS.subtext} /></InfoBubble>
              </View>
              <Text style={styles.settingValue}>{attenLimDb} dB</Text>
            </View>

            <GestureHandlerRootView style={styles.sliderWrapper}>
              <GestureDetector gesture={pan}>
                <View
                  style={styles.sliderTrack}
                  onLayout={(e) => {
                    sliderWidth.value = e.nativeEvent.layout.width;
                  }}
                >
                  <View style={styles.sliderBackground} />
                  <Animated.View style={[styles.sliderFill, animatedProgressStyle]} />
                  <View style={styles.stepsContainer}>
                    {ALSTEPS.map((step, index) => (
                      <View
                        key={step}
                        style={[
                          styles.stepDot,
                          { left: `${(index / (ALSTEPS.length - 1)) * 100}%`, paddingLeft: index === 0 ? 2 : 0 },
                          attenLimDb >= step && { backgroundColor: theme.COLORS.primary }
                        ]}
                      />
                    ))}
                  </View>
                  <Animated.View style={[styles.thumb, animatedThumbStyle]} />
                </View>
              </GestureDetector>
            </GestureHandlerRootView>

            <View style={styles.stepsLabels}>
              {ALSTEPS.map((step) => (
                <Text key={step} style={styles.stepLabel}>{step}</Text>
              ))}
            </View>

          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    marginTop: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.SPACING.medium,
  },
  headerText: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: theme.SPACING.medium,
    paddingBottom: theme.SPACING.medium,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  settingItem: {
    marginTop: theme.SPACING.small,
  },
  settingLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingLabel: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingValue: {
    color: theme.COLORS.primary,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
  },
  sliderWrapper: {
    height: 40,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 6,
    width: "100%",
    justifyContent: "center",
  },
  sliderBackground: {
    position: "absolute",
    height: 6,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
  },
  sliderFill: {
    position: "absolute",
    height: 6,
    backgroundColor: theme.COLORS.primary,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.COLORS.text,
    borderWidth: 2,
    borderColor: theme.COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  stepsContainer: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    position: "absolute",
    marginLeft: -2,
  },
  stepsLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 0,
  },
  stepLabel: {
    color: theme.COLORS.subtext,
    fontSize: 10,
    width: 20,
    textAlign: "center",
  },
  description: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.xsmall,
    marginTop: 16,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
