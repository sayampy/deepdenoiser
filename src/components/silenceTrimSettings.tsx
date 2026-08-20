import * as theme from "@/src/constants/theme";
import type { SilenceTrimSettings } from "@/src/scripts/silenceTrim";
import Feather from "@expo/vector-icons/Feather";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CustomSlider from "./customSlider";
import InfoBubble from "./InfoBubble";

interface SilenceTrimProps {
  settings: SilenceTrimSettings;
  onChange: (settings: SilenceTrimSettings) => void;
}

const THRESHOLD_STEPS = [-60, -55, -50, -45, -40, -35, -30, -25, -20];

const MIN_PAUSE_STEPS = [200, 300, 400, 500, 600, 800, 1000, 1500, 2000];

// eslint-disable-next-line @typescript-eslint/no-redeclare -- component name matches its props type by convention
export default function SilenceTrimSettings({
  settings,
  onChange,
}: SilenceTrimProps) {
  const setMode = (mode: "auto" | "manual") => {
    if (settings.mode === mode) return;
    onChange({ ...settings, mode });
  };

  return (
    <View>
      <View style={[styles.settingItem, { marginBottom: 10 }]}>
        <View style={styles.settingLabelRow}>
          <View style={theme.Styles.row}>
            <Text style={styles.settingLabel}>Trim Silence</Text>
            <View style={styles.betaTag}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
            <InfoBubble
              text={`Removes quiet pauses from the denoised audio, which shortens the duration.\n\nAuto: analyzes the audio and picks a threshold.\nManual: you set the threshold and minimum pause length.\n\nOnly pauses that are quiet enough AND long enough are removed.`}
            >
              <Feather
                name="help-circle"
                size={18}
                color={theme.COLORS.subtext}
              />
            </InfoBubble>
          </View>
          <Host matchContents style={{ width: 52, height: 32 }} colorScheme="dark">
            <Switch
              value={settings.enabled}
              onCheckedChange={(value) => onChange({ ...settings, enabled: value })}
              colors={{
                uncheckedTrackColor: theme.COLORS.border,
                checkedTrackColor: theme.COLORS.primary,
                checkedThumbColor: theme.COLORS.text,
                uncheckedThumbColor: theme.COLORS.text,
              }}
            />
          </Host>
        </View>
      </View>

      {settings.enabled && (
        <View>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modePill,
                settings.mode === "auto" && styles.modePillActive,
              ]}
              onPress={() => setMode("auto")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeText,
                  settings.mode === "auto" && styles.modeTextActive,
                ]}
              >
                Auto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modePill,
                settings.mode === "manual" && styles.modePillActive,
              ]}
              onPress={() => setMode("manual")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeText,
                  settings.mode === "manual" && styles.modeTextActive,
                ]}
              >
                Manual
              </Text>
            </TouchableOpacity>
          </View>

          {settings.mode === "manual" && (
            <View>
              <CustomSlider
                label="Silence Threshold"
                value={settings.thresholdDb}
                onValueChange={(value) =>
                  onChange({ ...settings, thresholdDb: value })
                }
                min={-60}
                max={-20}
                steps={THRESHOLD_STEPS}
                info={`How quiet a section must be to count as silence. Higher = more aggressive.`}
              />
              <CustomSlider
                label="Min Pause Length"
                value={settings.minSilenceMs}
                onValueChange={(value) =>
                  onChange({ ...settings, minSilenceMs: value })
                }
                min={200}
                max={2000}
                steps={MIN_PAUSE_STEPS}
                unit="ms"
                info={`Only silences longer than this are removed.\n\n500ms = recommended (natural pauses are shorter — longer ones are hesitations).\n200-400ms = removes more.\n800ms+ = removes only long pauses.`}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

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
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  modePillActive: {
    backgroundColor: theme.COLORS.primary,
    borderColor: theme.COLORS.primary,
  },
  modeText: {
    color: theme.COLORS.subtext,
    fontSize: 13,
    fontWeight: "700",
  },
  modeTextActive: {
    color: theme.COLORS.background,
  },
  betaTag: {
    backgroundColor: theme.COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  betaText: {
    color: theme.COLORS.background,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
