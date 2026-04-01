import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import DonationModal from "@/src/components/DonationModal";
import SettingsSidebar from "@/src/components/SettingsSidebar";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={theme.Styles.container}>
      <ScrollView
        contentContainerStyle={theme.Styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsVisible(true)}
        >
          <Feather name="settings" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <View style={theme.Styles.header}>
          <Text style={theme.Styles.title}>About DeepDenoiser</Text>
          <Text style={theme.Styles.subtitle}>Version 1.1.0</Text>
        </View>

        <View style={[theme.Styles.card, styles.infoCard]}>
          <Text style={styles.cardTitle}>What is DeepDenoiser?</Text>
          <Text style={styles.cardText}>
            DeepDenoiser is an open-source tool designed to make
            professional-grade audio noise reduction accessible to everyone. It
            uses state-of-the-art deep learning to isolate speech and remove
            background noise in real-time from Video and Audio. Your files never
            leave your device. Processing happens on your Device.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Connect</Text>
        <View style={styles.linkContainer}>
          <TouchableOpacity
            style={[theme.Styles.button, styles.linkButton]}
            onPress={() => openLink("https://github.com/sayampy/deepdenoiser")}
          >
            <Feather name="github" size={20} color={theme.COLORS.background} />
            <Text style={[theme.Styles.buttonText, { marginLeft: 10 }]}>
              GitHub Repo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              theme.Styles.button,
              theme.Styles.buttonSecondary,
              styles.linkButton,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="user" size={20} color={theme.COLORS.primary} />
            <Text
              style={[
                theme.Styles.buttonText,
                theme.Styles.buttonTextSecondary,
                { marginLeft: 10 },
              ]}
            >
              Donate Me
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with{" "}
            <Image
              source={require("@/assets/images/heart_india.png")}
              style={{
                width: 15,
                height: 15,
                // marginTop: 5,
              }}
            />{" "}
            by Sayampy
          </Text>
        </View>

        <DonationModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />

        <SettingsSidebar
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    position: "absolute",
    right: 0,
    top: -10,
    padding: 10,
  },
  infoCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "700",
    color: theme.COLORS.primary,
    marginBottom: 8,
  },
  cardText: {
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.text,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "700",
    color: theme.COLORS.text,
    marginBottom: 16,
    marginTop: 8,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  featureItem: {
    width: "48%",
    backgroundColor: theme.COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    color: theme.COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
    lineHeight: 18,
  },
  linkContainer: {
    gap: 12,
    marginBottom: 32,
  },
  linkButton: {
    width: "100%",
  },
  footer: {
    alignItems: "center",
    marginTop: 8,
    paddingBottom: 24,
  },
  footerText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
  },
});
