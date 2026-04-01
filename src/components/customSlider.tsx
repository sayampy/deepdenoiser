import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import InfoBubble from "./InfoBubble";

export interface CustomSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  steps?: number[];
  unit?: string;
  info?: string;
  decimalPlaces?: number;
}

const CustomSlider = ({
  label,
  value,
  onValueChange,
  min,
  max,
  steps,
  unit = "dB",
  info,
  decimalPlaces = 0,
}: CustomSliderProps) => {
  const sliderWidth = useSharedValue(0);
  const isPressed = useSharedValue(false);

  const progress = useSharedValue(0);

  // Update progress if value changes from outside (e.g. initial load)
  React.useEffect(() => {
    const getInitialProgress = () => {
      if (steps) {
        const index = steps.indexOf(value);
        return index >= 0 ? index / (steps.length - 1) : 0;
      }
      return (value - min) / (max - min);
    };
    progress.value = withSpring(getInitialProgress());
  }, [value, steps, min, max, progress]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      isPressed.value = true;
    })
    .onUpdate((event) => {
      if (sliderWidth.value <= 0) return;
      const newProgress = Math.max(0, Math.min(1, event.x / sliderWidth.value));
      progress.value = newProgress;

      if (!steps) {
        const newValue = min + newProgress * (max - min);
        runOnJS(onValueChange)(Number(newValue.toFixed(decimalPlaces)));
      }
    })
    .onEnd(() => {
      isPressed.value = false;
      if (steps) {
        const stepCount = steps.length - 1;
        const nearestStepIndex = Math.round(progress.value * stepCount);
        progress.value = withSpring(nearestStepIndex / stepCount);
        runOnJS(onValueChange)(steps[nearestStepIndex]);
      } else {
        const newValue = min + progress.value * (max - min);
        runOnJS(onValueChange)(Number(newValue.toFixed(decimalPlaces)));
      }
    })
    .onFinalize(() => {
      isPressed.value = false;
    });

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      left: `${progress.value * 100}%`,
      transform: [
        { translateX: -10 },
        { scale: withSpring(isPressed.value ? 1.3 : 1) },
      ],
      backgroundColor: isPressed.value ? theme.COLORS.text : theme.COLORS.text,
      borderColor: isPressed.value ? theme.COLORS.primary : theme.COLORS.primary,
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View style={styles.settingItem}>
      <View style={styles.settingLabelRow}>
        <View style={theme.Styles.row}>
          <Text style={styles.settingLabel}>{label}</Text>
          {info && (
            <InfoBubble text={info}>
              <Feather
                name="help-circle"
                size={16}
                color={theme.COLORS.subtext}
              />
            </InfoBubble>
          )}
        </View>
        <Text style={styles.settingValue}>
          {value} {unit}
        </Text>
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

            {steps && (
              <View style={styles.stepsContainer}>
                {steps.map((step, index) => (
                  <View
                    key={step}
                    style={[
                      styles.stepDot,
                      { left: `${(index / (steps.length - 1)) * 100}%` },
                      value >= step && { backgroundColor: theme.COLORS.primary },
                    ]}
                  />
                ))}
              </View>
            )}

            <Animated.View style={[styles.thumb, animatedThumbStyle]} />
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {steps && (
        <View style={styles.stepsLabels}>
          {steps.map((step) => (
            <Text key={step} style={styles.stepLabel}>
              {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

export default CustomSlider;

const styles = StyleSheet.create({
  settingItem: {
    marginTop: theme.SPACING.small,
  },
  settingLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  settingLabel: {
    color: theme.COLORS.subtext,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingValue: {
    color: theme.COLORS.primary,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "700",
  },
  sliderWrapper: {
    height: 32,
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
    marginTop: 4,
    paddingHorizontal: 0,
  },
  stepLabel: {
    color: theme.COLORS.subtext,
    fontSize: 10,
    width: 20,
    textAlign: "center",
  },
});
