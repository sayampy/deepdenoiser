import { Platform, StyleSheet } from "react-native";
import type { ThemePalette } from "@/src/scripts/settings";

export interface PaletteColors {
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  text: string;
  subtext: string;
  white: string;
  error: string;
  success: string;
  border: string;
  outlineVariant: string;
  glow: string;
}

export type ColorMode = "light" | "dark";

interface PalettePair {
  light: PaletteColors;
  dark: PaletteColors;
}

/**
 * Authentic Android 12+ Material You (Monet) tonal palettes. The dark sets are
 * the original app palettes; the light sets are their Material 3 tonal counterparts
 * (primary = A1 tone 40, container = A1 tone 90, on-container = A1 tone 10,
 * neutral backgrounds = N1 tones 98/95/92...).
 *
 * These are the FALLBACK palettes. When a real wallpaper palette is available,
 * ThemeContext replaces COLORS with the native-derived tones.
 */
export const THEME_PALETTES: Record<ThemePalette, PalettePair> = {
  cyan: {
    dark: {
      primary: "#70F5FF", // Material You Teal/Cyan A1-200
      primaryContainer: "#004F58", // A1-700
      onPrimaryContainer: "#C7F8FF", // A1-100
      secondary: "#A5CED4", // A2-200
      accent: "#FBBF24",
      background: "#0E1416", // N1-900
      surface: "#161E20", // N1-800
      surfaceContainer: "#1D272A", // N1-700
      surfaceContainerHigh: "#253236", // N1-600
      surfaceContainerHighest: "#2E3D42",
      text: "#F1F5F9",
      subtext: "#8E9DA3",
      white: "#FFFFFF",
      error: "#FFB4AB",
      success: "#66DBB2",
      border: "#334146",
      outlineVariant: "#253236",
      glow: "rgba(112, 245, 255, 0.15)",
    },
    light: {
      primary: "#006B75", // A1-700 on light backgrounds
      primaryContainer: "#A7F0FA", // A1-90
      onPrimaryContainer: "#003A41", // A1-10
      secondary: "#3F6269",
      accent: "#8A5A00",
      background: "#F7FAFB", // N1-98
      surface: "#EEF3F4", // N1-95
      surfaceContainer: "#DEE8EA", // N1-92
      surfaceContainerHigh: "#D3DEE1", // N1-90
      surfaceContainerHighest: "#C7D4D7", // N1-88
      text: "#111718", // N1-10
      subtext: "#4D5C61", // N1-50
      white: "#FFFFFF",
      error: "#B3261E",
      success: "#006A4E",
      border: "#B9C6C9", // N1-80
      outlineVariant: "#D8E1E3", // N1-85
      glow: "rgba(0, 107, 117, 0.15)",
    },
  },
  ocean: {
    dark: {
      primary: "#93CCEA", // Material You Blue A1-200
      primaryContainer: "#0B4A6F",
      onPrimaryContainer: "#CDE5FF",
      secondary: "#B6C8D8",
      accent: "#FBBF24",
      background: "#0E141B",
      surface: "#151E27",
      surfaceContainer: "#1D2A37",
      surfaceContainerHigh: "#263647",
      surfaceContainerHighest: "#304358",
      text: "#F1F5F9",
      subtext: "#8E9EAE",
      white: "#FFFFFF",
      error: "#FFB4AB",
      success: "#66DBB2",
      border: "#304254",
      outlineVariant: "#202E3D",
      glow: "rgba(147, 204, 234, 0.15)",
    },
    light: {
      primary: "#0B557D",
      primaryContainer: "#C8E5FF",
      onPrimaryContainer: "#083A57",
      secondary: "#41617A",
      accent: "#8A5A00",
      background: "#F7FAFF",
      surface: "#ECF2FA",
      surfaceContainer: "#DAE6F4",
      surfaceContainerHigh: "#CEDDF0",
      surfaceContainerHighest: "#C1D4EA",
      text: "#111820",
      subtext: "#4C5A6B",
      white: "#FFFFFF",
      error: "#B3261E",
      success: "#006A4E",
      border: "#B6C7DA",
      outlineVariant: "#D7E2ED",
      glow: "rgba(11, 85, 125, 0.15)",
    },
  },
  emerald: {
    dark: {
      primary: "#A3D9B1", // Material You Green/Sage A1-200
      primaryContainer: "#1B522E",
      onPrimaryContainer: "#D2F7DB",
      secondary: "#B7CCBC",
      accent: "#FBBF24",
      background: "#0F1511",
      surface: "#17211A",
      surfaceContainer: "#202D24",
      surfaceContainerHigh: "#2A3A2F",
      surfaceContainerHighest: "#35483B",
      text: "#F1F5F9",
      subtext: "#8E9E93",
      white: "#FFFFFF",
      error: "#FFB4AB",
      success: "#66DBB2",
      border: "#324337",
      outlineVariant: "#223027",
      glow: "rgba(163, 217, 177, 0.15)",
    },
    light: {
      primary: "#2C633D",
      primaryContainer: "#C3EDCB",
      onPrimaryContainer: "#123F20",
      secondary: "#476454",
      accent: "#8A5A00",
      background: "#F7FBF8",
      surface: "#EDF5EF",
      surfaceContainer: "#DBE9DE",
      surfaceContainerHigh: "#CFE1D4",
      surfaceContainerHighest: "#C2D8C8",
      text: "#111914",
      subtext: "#4C5C51",
      white: "#FFFFFF",
      error: "#B3261E",
      success: "#006A4E",
      border: "#B4CBB9",
      outlineVariant: "#D6E5D9",
      glow: "rgba(44, 99, 61, 0.15)",
    },
  },
  violet: {
    dark: {
      primary: "#CDBBEB", // Material You Purple/Lavender A1-200
      primaryContainer: "#4B3674",
      onPrimaryContainer: "#ECDEFF",
      secondary: "#CCC2D9",
      accent: "#FBBF24",
      background: "#14101A",
      surface: "#1D1726",
      surfaceContainer: "#282035",
      surfaceContainerHigh: "#342A45",
      surfaceContainerHighest: "#413556",
      text: "#F1F5F9",
      subtext: "#9A8EA6",
      white: "#FFFFFF",
      error: "#FFB4AB",
      success: "#66DBB2",
      border: "#3F3252",
      outlineVariant: "#2B2139",
      glow: "rgba(205, 187, 235, 0.15)",
    },
    light: {
      primary: "#5F4787",
      primaryContainer: "#E2D6FF",
      onPrimaryContainer: "#3D2B5C",
      secondary: "#5D5470",
      accent: "#8A5A00",
      background: "#FBF8FF",
      surface: "#F1ECFA",
      surfaceContainer: "#E4DAF2",
      surfaceContainerHigh: "#DACDEC",
      surfaceContainerHighest: "#CFBFE5",
      text: "#191420",
      subtext: "#585064",
      white: "#FFFFFF",
      error: "#B3261E",
      success: "#006A4E",
      border: "#C9BEDB",
      outlineVariant: "#E5DDEE",
      glow: "rgba(95, 71, 135, 0.15)",
    },
  },
  amber: {
    dark: {
      primary: "#E5C08B", // Material You Sand/Amber A1-200
      primaryContainer: "#5E4018",
      onPrimaryContainer: "#FFE2BC",
      secondary: "#DAC4AA",
      accent: "#FB923C",
      background: "#16120D",
      surface: "#221C14",
      surfaceContainer: "#2E261B",
      surfaceContainerHigh: "#3B3123",
      surfaceContainerHighest: "#493C2C",
      text: "#F1F5F9",
      subtext: "#A39785",
      white: "#FFFFFF",
      error: "#FFB4AB",
      success: "#66DBB2",
      border: "#473A2A",
      outlineVariant: "#31281D",
      glow: "rgba(229, 192, 139, 0.15)",
    },
    light: {
      primary: "#7A5314",
      primaryContainer: "#FFE0B2",
      onPrimaryContainer: "#543807",
      secondary: "#6B5A45",
      accent: "#9A4A00",
      background: "#FDF9F3",
      surface: "#F6EDE1",
      surfaceContainer: "#EFE0CB",
      surfaceContainerHigh: "#E6D4B9",
      surfaceContainerHighest: "#DCC7A7",
      text: "#1D1811",
      subtext: "#5E5346",
      white: "#FFFFFF",
      error: "#B3261E",
      success: "#006A4E",
      border: "#D2C0A5",
      outlineVariant: "#EBDCC7",
      glow: "rgba(122, 83, 20, 0.15)",
    },
  },
};

/**
 * Live palette object. Every `COLORS.x` read resolves against whichever palette
 * ThemeContext has applied, so inline styles update without any codemod.
 * Module-level `StyleSheet.create` calls are rebuilt through the `Styles` proxy
 * (see below) once applyPalette() runs.
 */
export const COLORS: PaletteColors = { ...THEME_PALETTES.cyan.dark };

export function getPalette(palette?: ThemePalette, mode: ColorMode = "dark"): PaletteColors {
  const entry = (palette && THEME_PALETTES[palette]) || THEME_PALETTES.cyan;
  return entry[mode];
}

/** Replace all colors in place and invalidate cached shared styles. */
export function applyPalette(palette: PaletteColors): void {
  Object.assign(COLORS, palette);
  sharedStylesCache = null;
}

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
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
  largeTitle: 32,
  title: 22,
  heading: 18,
  body: 15,
  small: 13,
  xsmall: 11,
};

export const SPACING = {
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
};

function buildSharedStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.medium,
    },
    contentContainer: {
      paddingBottom: SPACING.xlarge,
    },
    header: {
      marginTop: SPACING.medium,
      marginBottom: SPACING.medium,
      alignItems: "center",
    },
    title: {
      fontSize: FONT_SIZE.title,
      fontWeight: "700",
      color: COLORS.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: FONT_SIZE.body,
      color: COLORS.subtext,
      textAlign: "center",
      marginTop: SPACING.small,
      lineHeight: 20,
    },
    card: {
      backgroundColor: COLORS.surfaceContainer,
      borderRadius: RADIUS.lg,
      padding: SPACING.medium,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    button: {
      flexDirection: "row",
      backgroundColor: COLORS.primary,
      height: 52,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.large,
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    buttonText: {
      color: COLORS.background,
      fontSize: FONT_SIZE.body,
      fontWeight: "700",
    },
    buttonTextSecondary: {
      color: COLORS.text,
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
}

let sharedStylesCache: ReturnType<typeof buildSharedStyles> | null = null;

export function getSharedStyles(): ReturnType<typeof buildSharedStyles> {
  if (!sharedStylesCache) {
    sharedStylesCache = buildSharedStyles();
  }
  return sharedStylesCache;
}

/**
 * Drop-in replacement for the old module-level `Styles` object. Property reads
 * are forwarded to a palette-aware cache, so existing `Styles.card` references
 * keep working and always resolve against the active palette.
 */
export const Styles: ReturnType<typeof buildSharedStyles> = new Proxy(
  {} as ReturnType<typeof buildSharedStyles>,
  {
    get(_target, key: string) {
      return getSharedStyles()[key as keyof ReturnType<typeof buildSharedStyles>];
    },
  },
);
