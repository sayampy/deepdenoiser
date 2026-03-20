import { Platform, StyleSheet } from "react-native";

export const COLORS = {
  primary: "#00E5FF", // Vibrant Cyan
  secondary: "#1E293B", // Deep Slate
  accent: "#F59E0B", // Amber
  background: "#0F172A", // Dark Navy
  surface: "#1E293B", // Lighter Navy for cards
  text: "#F8FAFC", // Off White
  subtext: "#94A3B8", // Slate Blue/Gray
  white: "#FFFFFF",
  error: "#EF4444", // Bright Red
  success: "#10B981", // Emerald Green
  border: "#334155",
};

export const FONTS = Platform.select({
  ios: {
    sans: "System",
    serif: "Georgia",
    rounded: "System",
    mono: "Courier",
  },
  default: {
    sans: "sans-serif",
    serif: "serif",
    rounded: "sans-serif",
    mono: "monospace",
  },
});

export const FONT_SIZE = {
  largeTitle: 34,
  title: 24,
  heading: 20,
  body: 16,
  small: 14,
  xsmall: 12,
};

export const SPACING = {
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
};

export const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.medium,
    paddingTop: Platform.OS === 'ios' ? 0 : SPACING.large,
  },
  contentContainer: {
    paddingBottom: SPACING.xlarge,
  },
  header: {
    marginTop: SPACING.xxlarge,
    marginBottom: SPACING.xlarge,
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZE.largeTitle,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.subtext,
    textAlign: "center",
    marginTop: SPACING.small,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.large,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.body,
    fontWeight: "700",
  },
  buttonTextSecondary: {
    color: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  icon: {
    marginRight: SPACING.small,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
