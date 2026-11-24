import * as theme from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { setSystemBarTone } from "@/modules/DynamicColorModule";
import { useStyles } from "@/src/hooks/useStyles";
import { dispose as disposeAptabase } from "@aptabase/react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppSettings,
  getSettings,
  updateSettings,
  type ThemeMode,
  type ThemePalette,
  type VideoExportFormat,
} from "../scripts/settings";
import {
  chooseSaveDirectory,
  clearSaveDirectory,
  getSaveDirectoryName,
} from "../scripts/saveDestinations";
import ModelPicker from "./ModelPicker";
import {
  EXPORT_FORMATS,
  MP3_BITRATES,
  M4A_BITRATES,
  type ExportFormat,
} from "@/src/scripts/audioExport";
import { getModel } from "../scripts/models/registry";

interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
}

const VIDEO_FORMATS: { id: VideoExportFormat; name: string; desc: string }[] = [
  {
    id: "original",
    name: "Original video stream",
    desc: "Lossless video passthrough without re-encoding.",
  },
  {
    id: "compressed",
    name: "Compressed MP4",
    desc: "Transcodes video for smaller file size and faster sharing.",
  },
];

export default function SettingsSidebar({ visible, onClose }: SettingsSidebarProps) {
  const insets = useSafeAreaInsets();
  const {
    colorScheme,
    palette: activePalette,
    isDark: activeIsDark,
    themeMode,
    themePalette,
    dynamicActive,
    setThemeMode,
    setThemePalette,
    setUseSystemTheme,
  } = useTheme();
  const styles = useStyles(makeStyles);
  const [isModelPickerVisible, setIsModelPickerVisible] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async data load
      void loadSettings();
    }
  }, [visible]);

  const handleToggle = async (key: keyof AppSettings, value: boolean) => {
    if (key === "useSystemTheme") {
      await setUseSystemTheme(value);
      setSettings(await getSettings());
      return;
    }
    const updated = await updateSettings({ [key]: value });
    setSettings(updated);
    if (key === "analytics" && !value) {
      disposeAptabase();
    }
  };

  const handleThemeMode = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    setSettings(await getSettings());
  };

  const handleThemePalette = async (palette: ThemePalette) => {
    await setThemePalette(palette);
    setSettings(await getSettings());
  };

  const handleChooseSaveDirectory = async () => {
    try {
      const uri = await chooseSaveDirectory();
      if (uri) await loadSettings();
    } catch (error) {
      Alert.alert(
        "Could not choose folder",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleExportFormat = async (format: ExportFormat) => {
    const updated = await updateSettings({ exportFormat: format });
    setSettings(updated);
  };

  const handleVideoExportFormat = async (format: VideoExportFormat) => {
    const updated = await updateSettings({ videoExportFormat: format });
    setSettings(updated);
  };

  const handleMp3Bitrate = async (bitrate: number) => {
    const updated = await updateSettings({ mp3Bitrate: bitrate });
    setSettings(updated);
  };

  const handleM4aBitrate = async (bitrate: number) => {
    const updated = await updateSettings({ m4aBitrate: bitrate });
    setSettings(updated);
  };

  const handleClearSaveDirectory = async () => {
    try {
      await clearSaveDirectory();
      await loadSettings();
    } catch (error) {
      Alert.alert(
        "Could not reset folder",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  useEffect(() => {
    // A Modal opens a separate Android window; retint the bars for that window.
    if (visible) void setSystemBarTone(activePalette.background, activeIsDark);
  }, [visible, activePalette, activeIsDark]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!settings || !visible) return null;
  const saveDirectoryName = getSaveDirectoryName(settings.saveDirectoryUri);
  const selectedModel = getModel(settings.selectedModel);
  const isAndroid12Plus =
    Platform.OS === "android" &&
    (typeof Platform.Version === "number"
      ? Platform.Version >= 31
      : parseInt(String(Platform.Version), 10) >= 31);

  return (
    // A normal overlay stays in the Activity window (unlike a native Modal
    // dialog, which gets its own light-colored window), so the Android system
    // bars keep the themed tone while settings are open.
    <View style={styles.rootOverlay}>
      <View style={styles.container}>
        <Pressable style={styles.overlay} onPress={onClose} />

        <View
          style={[
            styles.sidebar,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={20} color={theme.COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* AI Model */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>AI Model</Text>
              <View style={styles.modelDisplayCard}>
                <View style={styles.modelNameRow}>
                  <Text style={styles.modelName}>{selectedModel.name}</Text>
                  <Text style={styles.rateText}>{selectedModel.sampleRate / 1000} kHz</Text>
                </View>
                <Text style={styles.modelDesc}>{selectedModel.description}</Text>
              </View>

              <TouchableOpacity
                style={styles.outlineActionBtn}
                onPress={() => setIsModelPickerVisible(true)}
              >
                <Text style={styles.outlineActionText}>Change or download models</Text>
              </TouchableOpacity>
            </View>

            {/* Appearance: light/dark + wallpaper-derived Material You colors */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Appearance</Text>
              <Text style={styles.sublabel}>Theme</Text>
              <View style={styles.chipsRow}>
                {(["system", "light", "dark"] as ThemeMode[]).map((mode) => {
                  const active = themeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.choiceChip, active && styles.choiceChipActive]}
                      onPress={() => handleThemeMode(mode)}
                    >
                      <Text
                        style={[styles.choiceChipText, active && styles.choiceChipTextActive]}
                      >
                        {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isAndroid12Plus && (
                <View style={styles.settingItem}>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Wallpaper dynamic colors</Text>
                    <Text style={styles.settingDescription}>
                      {dynamicActive
                        ? "Using colors from your current wallpaper"
                        : "Use Material You colors extracted from your system wallpaper"}
                    </Text>
                  </View>
                  <Host matchContents style={{ width: 50, height: 32 }} colorScheme={colorScheme}>
                    <Switch
                      value={settings.useSystemTheme}
                      onCheckedChange={(v) => handleToggle("useSystemTheme", v)}
                    />
                  </Host>
                </View>
              )}
              {!isAndroid12Plus || !settings.useSystemTheme ? (
                <>
                  <Text style={styles.sublabel}>
                    {isAndroid12Plus ? "Fallback palette" : "Theme palette"}
                  </Text>
                      <View style={styles.chipsRow}>
                        {(Object.keys(theme.THEME_PALETTES) as ThemePalette[]).map((palette) => {
                          const active = themePalette === palette;
                          return (
                            <TouchableOpacity
                              key={palette}
                              style={[styles.choiceChip, active && styles.choiceChipActive]}
                              onPress={() => handleThemePalette(palette)}
                            >
                              <View
                                style={[
                                  styles.paletteSwatch,
                                  { backgroundColor: theme.THEME_PALETTES[palette][colorScheme].primary },
                                ]}
                              />
                              <Text
                                style={[styles.choiceChipText, active && styles.choiceChipTextActive]}
                              >
                                {palette[0].toUpperCase() + palette.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                  </View>
                </>
              ) : null}
            </View>

            {/* Audio Export Format */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Audio Export Format</Text>
              <View style={styles.chipsRow}>
                {EXPORT_FORMATS.map((format) => {
                  const active = settings.exportFormat === format.id;
                  return (
                    <TouchableOpacity
                      key={format.id}
                      style={[styles.choiceChip, active && styles.choiceChipActive]}
                      onPress={() => handleExportFormat(format.id)}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          active && styles.choiceChipTextActive,
                        ]}
                      >
                        {format.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {settings.exportFormat === "mp3" && (
                <View style={styles.bitrateSection}>
                  <Text style={styles.sublabel}>MP3 Bitrate</Text>
                  <View style={styles.bitrateRow}>
                    {MP3_BITRATES.map((bitrate) => {
                      const active = settings.mp3Bitrate === bitrate;
                      return (
                        <TouchableOpacity
                          key={bitrate}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          onPress={() => handleMp3Bitrate(bitrate)}
                        >
                          <Text
                            style={[
                              styles.smallChipText,
                              active && styles.smallChipTextActive,
                            ]}
                          >
                            {bitrate}k
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {settings.exportFormat === "m4a" && (
                <View style={styles.bitrateSection}>
                  <Text style={styles.sublabel}>M4A (AAC) Bitrate</Text>
                  <View style={styles.bitrateRow}>
                    {M4A_BITRATES.map((bitrate) => {
                      const active = (settings.m4aBitrate ?? 192) === bitrate;
                      return (
                        <TouchableOpacity
                          key={bitrate}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          onPress={() => handleM4aBitrate(bitrate)}
                        >
                          <Text
                            style={[
                              styles.smallChipText,
                              active && styles.smallChipTextActive,
                            ]}
                          >
                            {bitrate}k
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Video Export Format */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Video Export Format</Text>
              <View style={styles.chipsRow}>
                {VIDEO_FORMATS.map((vf) => {
                  const active = (settings.videoExportFormat ?? "original") === vf.id;
                  return (
                    <TouchableOpacity
                      key={vf.id}
                      style={[styles.choiceChip, active && styles.choiceChipActive]}
                      onPress={() => handleVideoExportFormat(vf.id)}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          active && styles.choiceChipTextActive,
                        ]}
                      >
                        {vf.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.formatHint}>
                {(settings.videoExportFormat ?? "original") === "compressed"
                  ? "Re-encodes video to H.264 MP4 with optimized bitrate for lightweight file sharing."
                  : "Preserves the original video bit-for-bit, replacing only the audio track."}
              </Text>
            </View>

            {/* Save Location */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Save Destination</Text>
              <View style={styles.folderCard}>
                <Feather
                  name="folder"
                  size={18}
                  color={theme.COLORS.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.folderName} numberOfLines={1}>
                    {saveDirectoryName ?? "System Media Gallery"}
                  </Text>
                  <Text style={styles.folderHint}>
                    {saveDirectoryName
                      ? "Sorted into Original and Denoised subfolders"
                      : "Default Music and Movies folders"}
                  </Text>
                </View>
              </View>

              <View style={styles.folderBtnRow}>
                <TouchableOpacity
                  style={styles.folderSelectBtn}
                  onPress={handleChooseSaveDirectory}
                >
                  <Text style={styles.folderSelectText}>
                    {saveDirectoryName ? "Change folder" : "Select folder"}
                  </Text>
                </TouchableOpacity>

                {saveDirectoryName && (
                  <TouchableOpacity
                    style={styles.folderResetBtn}
                    onPress={handleClearSaveDirectory}
                  >
                    <Text style={styles.folderResetText}>Reset to Gallery</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Privacy & Updates */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Privacy</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Anonymous Analytics</Text>
                  <Text style={styles.settingDescription}>
                    Helps diagnose crashes and improve model performance
                  </Text>
                </View>
                <Host matchContents style={{ width: 50, height: 32 }} colorScheme={colorScheme}>
                  <Switch
                    value={settings.analytics}
                    onCheckedChange={(v) => handleToggle("analytics", v)}
                  />
                </Host>
              </View>
            </View>

            {/* Version */}
            <View style={styles.footer}>
              <Text style={styles.version}>
                DeepDenoiser {Constants.expoConfig?.version ?? "1.5.0"}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>

      <ModelPicker
        visible={isModelPickerVisible}
        onClose={() => {
          setIsModelPickerVisible(false);
          void loadSettings();
        }}
      />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  rootOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sidebar: {
    width: "88%",
    maxWidth: 360,
    backgroundColor: theme.COLORS.surface,
    height: "100%",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.COLORS.text,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: theme.COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modelDisplayCard: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  modelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modelName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.COLORS.primary,
  },
  rateText: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    fontWeight: "600",
  },
  modelDesc: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    lineHeight: 16,
  },
  outlineActionBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
  },
  outlineActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.COLORS.primary,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.COLORS.surface,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  choiceChipActive: {
    backgroundColor: theme.COLORS.surfaceContainerHigh,
    borderColor: theme.COLORS.primary,
  },
  choiceChipText: {
    fontSize: 13,
    color: theme.COLORS.subtext,
    fontWeight: "500",
  },
  choiceChipTextActive: {
    color: theme.COLORS.primary,
    fontWeight: "700",
  },
  formatHint: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    lineHeight: 16,
  },
  bitrateSection: {
    gap: 6,
    marginTop: 4,
  },
  sublabel: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    fontWeight: "600",
  },
  bitrateRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  smallChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.COLORS.surface,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  smallChipActive: {
    backgroundColor: theme.COLORS.surfaceContainerHigh,
    borderColor: theme.COLORS.primary,
  },
  smallChipText: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    fontWeight: "600",
  },
  smallChipTextActive: {
    color: theme.COLORS.primary,
    fontWeight: "700",
  },
  folderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.COLORS.surface,
    padding: 12,
    borderRadius: 14,
  },
  folderName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.COLORS.text,
  },
  folderHint: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    marginTop: 2,
  },
  folderBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  folderSelectBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.COLORS.surface,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  folderSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.COLORS.text,
  },
  folderResetBtn: {
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.COLORS.surface,
  },
  folderResetText: {
    fontSize: 12,
    color: theme.COLORS.subtext,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.COLORS.text,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.COLORS.subtext,
    marginTop: 2,
    lineHeight: 16,
  },
  paletteSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  version: {
    fontSize: 13,
    color: theme.COLORS.subtext,
  },
});
