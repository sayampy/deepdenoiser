/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform, StyleSheet } from "react-native";

// const tintColorLight = '#0a7ea4';
// const tintColorDark = '#fff';

export const COLORS = {
  primary: "#00bcd4",
  secondary: "#89b4b7ff",
  background: "#121212",
  text: "#fff",
  subtext: "#eaeaea",
  white: "#fff",
  error: "#d9534f",
};

export const FONTS = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const FONT_SIZE = {
  largeTitle: 32,
  title: 24,
  heading: 18,
  body: 16,
  small: 14,
  xsmall: 12,
};

export const SPACING = {
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
};
export const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.medium,
    paddingTop: SPACING.large,
    paddingBottom: SPACING.xlarge,
  },

  header: {
    alignItems: "center",
    marginTop: 60,
  },
  title: {
    fontFamily: FONTS.rounded,
    fontSize: FONT_SIZE.largeTitle,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.secondary,
    textAlign: "center",
  },
  bodyText: { color: COLORS.text },
  subText: { color: COLORS.subtext },

  button: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    minWidth: 160,
    /* paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.small, */
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: COLORS.secondary,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.body,
    fontWeight: "600",
    /* marginHorizontal: 8, */
  },
  card: {
    backgroundColor: COLORS.secondary,
    /* borderWidth: 1,
    borderColor: theme.COLORS.primary, */
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 8,
  },
});
