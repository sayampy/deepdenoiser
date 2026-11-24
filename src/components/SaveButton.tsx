import Feather from "@expo/vector-icons/Feather";
import * as fs from "expo-file-system";
import React, { useState } from "react";
import { Alert, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { saveToDevice } from "@/src/scripts/formatHandler";
import { exportFileNameFor, prepareExport } from "@/src/scripts/audioExport";
import { getSettings } from "@/src/scripts/settings";
import * as theme from "@/src/constants/theme";
import { chooseSaveDirectory, type SaveCategory } from "@/src/scripts/saveDestinations";
import { useStyles } from "@/src/hooks/useStyles";

interface SaveButtonProps {
  file: fs.File | null;
  label?: string;
  savedLabel?: string;
  albumName?: string;
  style?: StyleProp<ViewStyle>;
  savedBg?: string;
  saveCategory?: SaveCategory;
  onError?: (error: Error) => void;
}

export default function SaveButton({
  file,
  label = "Save to Gallery",
  savedLabel = "Saved",
  albumName,
  style,
  savedBg,
  saveCategory,
  onError,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [encoding, setEncoding] = useState<number | null>(null);
  const styles = useStyles(makeStyles);

  const handleSave = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      // Lossless WAV is the working format; the user picks what actually lands
      // on the device (MP3 is encoded once and cached per file).
      const settings = await getSettings();
      const exportFile = await prepareExport(file, settings, (fraction) =>
        setEncoding(Math.round(fraction * 100)),
      );
      setEncoding(null);

      // A re-encoded file lives in the cache under an internal name; hand the
      // OS a copy that carries the user's own title instead.
      let toSave = exportFile;
      let temporary: fs.File | null = null;
      if (exportFile.uri !== file.uri) {
        const ext = exportFile.name.toLowerCase().endsWith(".mp3")
          ? "mp3"
          : exportFile.name.toLowerCase().endsWith(".m4a")
            ? "m4a"
            : "wav";
        temporary = new fs.File(
          fs.Paths.cache,
          exportFileNameFor(file, ext),
        );
        if (temporary.exists) temporary.delete();
        await new fs.File(exportFile.uri).copy(temporary);
        toSave = temporary;
      }

      try {
        await saveToDevice(toSave, albumName, saveCategory);
      } finally {
        try {
          temporary?.delete();
        } catch {
          // The cache is pruned anyway; a failed cleanup must not fail the save.
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(saveError);
      } else {
        console.error("Save button failed:", saveError);
      }
    } finally {
      setEncoding(null);
      setSaving(false);
    }
  };

  const handleChooseSaveDirectory = async () => {
    try {
      const uri = await chooseSaveDirectory();
      if (uri) {
        Alert.alert(
          "Save folder updated",
          "New files will be organized into Original/Denoised and Audio/Video folders.",
        );
      }
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(saveError);
      } else {
        console.error("Could not select save folder:", saveError);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        style,
        saved && { backgroundColor: savedBg || theme.COLORS.success },
        saving && styles.saving,
      ]}
      onPress={handleSave}
      onLongPress={handleChooseSaveDirectory}
      disabled={!file || saving}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: !file || saving, busy: saving }}
      accessibilityHint="Long press to choose the save folder"
    >
      <Feather
        name={saving ? "clock" : saved ? "check" : "download"}
        size={18}
        color={saved ? theme.COLORS.white : theme.COLORS.background}
      />
      <Text style={[styles.text, saved && styles.savedText]}>
        {encoding !== null
          ? `Encoding ${encoding}%`
          : saving
            ? "Saving..."
            : saved
              ? savedLabel
              : label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = () => StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  saving: {
    opacity: 0.7,
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
