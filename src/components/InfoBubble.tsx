import * as theme from "@/src/constants/theme";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

interface InfoBubbleProps {
  text: string;
  children: React.ReactNode;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function InfoBubble({ text, children }: InfoBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [anchorPos, setAnchorPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [bubbleSize, setBubbleSize] = useState({ w: 0, h: 0 });
  const anchorRef = useRef<View>(null);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const translateY = useSharedValue(10);

  const showBubble = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorPos({ x, y, w: width, h: height });
      setIsVisible(true);
      
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withTiming(1, { 
        duration: 250, 
        easing: Easing.bezier(0.33, 1, 0.68, 1) 
      });
      translateY.value = withTiming(0, { 
        duration: 250, 
        easing: Easing.bezier(0.33, 1, 0.68, 1) 
      });
    });
  };

  const hideBubble = () => {
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withTiming(0.95, { duration: 150 });
    translateY.value = withTiming(5, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(setIsVisible)(false);
      }
    });
  };

  const onBubbleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBubbleSize({ w: width, h: height });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Calculate bubble position
  // 12 is the arrow size/2 + offset
  const top = anchorPos.y - bubbleSize.h - 12;
  let left = anchorPos.x + anchorPos.w / 2 - bubbleSize.w / 2;

  // Boundary checks to keep bubble on screen
  const padding = 20;
  if (left < padding) left = padding;
  if (left + bubbleSize.w > SCREEN_WIDTH - padding) {
    left = SCREEN_WIDTH - bubbleSize.w - padding;
  }

  // Arrow alignment
  const arrowLeft = anchorPos.x + anchorPos.w / 2 - left - 6;

  return (
    <View collapsable={false} ref={anchorRef}>
      <Pressable
        onPress={showBubble}
        hitSlop={8}
      >
        {children}
      </Pressable>

      <Modal
        transparent
        visible={isVisible}
        animationType="none"
        onRequestClose={hideBubble}
      >
        <AnimatedPressable 
          style={[styles.overlay, overlayStyle]} 
          onPress={hideBubble}
        >
          <Animated.View
            onLayout={onBubbleLayout}
            style={[
              styles.bubble,
              {
                position: 'absolute',
                top: top,
                left: left,
              },
              animatedStyle,
            ]}
          >
            <Text style={styles.bubbleText}>{text}</Text>
            <View 
                style={[
                    styles.arrow, 
                    { 
                        left: arrowLeft 
                    }
                ]} 
            />
          </Animated.View>
        </AnimatedPressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bubble: {
    backgroundColor: theme.COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: SCREEN_WIDTH * 0.8,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  bubbleText: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  arrow: {
    position: "absolute",
    bottom: -6.5, // Slightly offset to overlap with border
    width: 12,
    height: 12,
    backgroundColor: theme.COLORS.surface,
    transform: [{ rotate: "45deg" }],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.COLORS.border,
  },
});
