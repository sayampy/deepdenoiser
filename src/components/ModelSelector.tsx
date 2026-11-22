import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/src/constants/theme";
import { MODELS, type ModelId } from "@/src/scripts/models/registry";
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ModelBottomSheet from "./ModelBottomSheet";
import { useStyles } from "@/src/hooks/useStyles";

export interface ModelSelectorProps {
  value: ModelId;
  onChange: (id: ModelId) => void;
  label?: string;
  disabled?: boolean;
  requiredSampleRate?: number;
}

/**
 * Material Expressive Model Trigger Pill.
 * Tapping it smoothly raises the unified ModelBottomSheet menu.
 */
export default function ModelSelector({
  value,
  onChange,
  label = "AI Model",
  disabled = false,
  requiredSampleRate,
}: ModelSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const styles = useStyles(makeStyles);
  const activeModel = MODELS[value] ?? MODELS.deepfilternet3;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.card, disabled && styles.cardDisabled]}
        onPress={() => !disabled && setSheetOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Selected model: ${activeModel.name}`}
      >
        <View style={styles.leftContent}>
          <View style={styles.iconCircle}>
            <Feather name="cpu" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.modelName} numberOfLines={1}>
                {activeModel.name}
              </Text>
              <View style={styles.rateBadge}>
                <Text style={styles.rateBadgeText}>
                  {activeModel.sampleRate / 1000} kHz
                </Text>
              </View>
            </View>
            <Text style={styles.subtext} numberOfLines={1}>
              {activeModel.description}
            </Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.chevronCircle}>
            <Feather name="chevron-down" size={16} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>

      <ModelBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        selectedModelId={value}
        onSelect={(newId) => {
          onChange(newId);
          setSheetOpen(false);
        }}
        requiredSampleRate={requiredSampleRate}
      />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  container: {
    marginVertical: SPACING.small,
    gap: 6,
  },
  label: {
    fontSize: FONT_SIZE.small,
    fontWeight: "700",
    color: COLORS.subtext,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.lg,
    padding: SPACING.medium,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modelName: {
    fontSize: FONT_SIZE.body,
    fontWeight: "800",
    color: COLORS.text,
  },
  rateBadge: {
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.25)",
  },
  rateBadgeText: {
    fontSize: FONT_SIZE.xsmall - 2,
    fontWeight: "700",
    color: COLORS.primary,
  },
  subtext: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.subtext,
  },
  rightContent: {
    marginLeft: 10,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
});
