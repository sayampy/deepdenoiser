import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppSettings, getSettings, updateSettings } from "../scripts/settings";
import Aptabase from "@aptabase/react-native";

interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsSidebar({ visible, onClose }: SettingsSidebarProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const handleToggle = async (key: keyof AppSettings, value: boolean) => {
    const updated = await updateSettings({ [key]: value });
    setSettings(updated);
    Aptabase.dispose();
  };

  if (!settings) return null;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sidebar}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={theme.COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Analytics</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Anonymous Analytics</Text>
                <Text style={styles.settingDescription}>
                  Help us improve by sharing anonymous usage data.
                </Text>
              </View>
              <Switch
                value={settings.analytics}
                onValueChange={(v) => handleToggle("analytics", v)}
                trackColor={{ false: theme.COLORS.border, true: theme.COLORS.primary }}
                thumbColor={theme.COLORS.white}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Crash Reports</Text>
                <Text style={styles.settingDescription}>
                  Automatically send reports to help us fix bugs.
                </Text>
              </View>
              <Switch
                value={settings.crashlytics}
                onValueChange={(v) => handleToggle("crashlytics", v)}
                trackColor={{ false: theme.COLORS.border, true: theme.COLORS.primary }}
                thumbColor={theme.COLORS.white}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>Version 1.1.0</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebar: {
    width: "80%",
    maxWidth: 300,
    backgroundColor: theme.COLORS.background,
    height: "100%",
    padding: 24,
    borderLeftWidth: 1,
    borderLeftColor: theme.COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 40,
  },
  title: {
    fontSize: theme.FONT_SIZE.title,
    fontWeight: "800",
    color: theme.COLORS.primary,
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "700",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "600",
    color: theme.COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: theme.FONT_SIZE.xsmall,
    color: theme.COLORS.subtext,
    lineHeight: 16,
  },
  footer: {
    paddingBottom: 20,
    alignItems: "center",
  },
  version: {
    fontSize: theme.FONT_SIZE.xsmall,
    color: theme.COLORS.subtext,
  },
});
