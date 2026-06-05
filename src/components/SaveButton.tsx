import Feather from "@expo/vector-icons/Feather";
import * as fs from "expo-file-system";
import React, { useState } from "react";
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { saveToDevice } from "@/src/scripts/formatHandler";
import * as theme from "@/src/constants/theme";

interface SaveButtonProps {
  file: fs.File | null;
  label?: string;
  savedLabel?: string;
  style?: StyleProp<ViewStyle>;
  savedBg?: string;
  onError?: (error: Error) => void;
}

export default function SaveButton({
  file,
  label = "Save to Gallery",
  savedLabel = "Saved",
  style,
  savedBg,
  onError,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!file) return;
    const success = await saveToDevice(file);
    if (!success) {
      onError?.(new Error("Media library access is required to save files. Grant storage permission in Settings."));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        style,
        saved && { backgroundColor: savedBg || theme.COLORS.success },
      ]}
      onPress={handleSave}
      activeOpacity={0.7}
    >
      <Feather
        name={saved ? "check" : "download"}
        size={18}
        color={saved ? theme.COLORS.white : theme.COLORS.background}
      />
      <Text style={[styles.text, saved && styles.savedText]}>
        {saved ? savedLabel : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: {
    color: theme.COLORS.background,
    fontWeight: "800",
    fontSize: 14,
  },
  savedText: {
    color: theme.COLORS.white,
  },
});
