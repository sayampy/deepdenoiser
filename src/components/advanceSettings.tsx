import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomSlider from "./customSlider";
import InfoBubble from "./InfoBubble";

interface AdvanceSettingsProps {
  attenLimDb: number;
  onAttenLimDbChange: (value: number) => void;
  normalize: {
    toggle: boolean;
    targetRMS: number;
    maxPeakDb: number;
  };
  onNormalizeChange: (value: any) => void;
}

const ALSTEPS = [0, 5, 10, 15, 20, 25];

export default function AdvanceSettings({
  attenLimDb,
  onAttenLimDbChange,
  normalize,
  onNormalizeChange,
}: AdvanceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleNormalize = () => {
    onNormalizeChange({
      ...normalize,
      toggle: !normalize.toggle,
    });
  };

  const handleTargetRMSChange = (val: number) => {
    onNormalizeChange({
      ...normalize,
      targetRMS: val,
    });
  };

  const handleMaxPeakChange = (val: number) => {
    onNormalizeChange({
      ...normalize,
      maxPeakDb: val,
    });
  };

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
          <View style={[styles.settingItem, { marginBottom: 10 }]}>
            <View style={styles.settingLabelRow}>
              <View style={theme.Styles.row}>
                <Text style={styles.settingLabel}>Loudness Normalization</Text>
                <InfoBubble text={`Automatically adjust audio volume to a consistent level before processing.\nHelps improve AI results on quiet recordings.\nDo not Use when the speech is within normal hearing range.`}>
                  <Feather name="help-circle" size={18} color={theme.COLORS.subtext} />
                </InfoBubble>
              </View>
              <Switch
                value={normalize.toggle}
                onValueChange={handleToggleNormalize}
                trackColor={{ false: theme.COLORS.border, true: theme.COLORS.primary }}
                thumbColor={theme.COLORS.text}
                ios_backgroundColor={theme.COLORS.border}
              />
            </View>
          </View>

          {normalize.toggle && (
            <View>
              <CustomSlider
                label="Target RMS"
                value={normalize.targetRMS}
                onValueChange={handleTargetRMSChange}
                min={-20}
                max={-10}
                decimalPlaces={0}
                info={"Target average loudness level. -14dB is standard for mobile apps.\nLower values means more dynamic natural audio"}
              />
              <CustomSlider
                label="Peak Limit"
                value={normalize.maxPeakDb}
                onValueChange={handleMaxPeakChange}
                min={-10}
                max={0}
                decimalPlaces={0}
                info={"Maximum allowed peak level to prevent clipping. -1.0dB is safe.\nlower means more clipping"}
              />
            </View>
          )}

          <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.05)", marginVertical: 15 }} />

          <CustomSlider
            label="Attenuation Limit"
            value={attenLimDb}
            onValueChange={onAttenLimDbChange}
            min={0}
            max={25}
            steps={ALSTEPS}
            info={`Higher values preserve more background noise.\n0dB means maximum noise reduction.`}
          />
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
    marginBottom: 12,
  },
  settingLabel: {
    color: theme.COLORS.subtext,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
