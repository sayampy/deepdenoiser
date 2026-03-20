import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
export default function AboutScreen() {
  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={theme.Styles.container}>
      <ScrollView contentContainerStyle={theme.Styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={theme.Styles.header}>
          <Text style={theme.Styles.title}>About DeepDenoiser</Text>
          <Text style={theme.Styles.subtitle}>
            Version 1.0.0
          </Text>
        </View>

        <View style={[theme.Styles.card, styles.infoCard]}>
          <Text style={styles.cardTitle}>What is DeepDenoiser</Text>
          <Text style={styles.cardText}>
            DeepDenoiser is an open-source tool designed to make professional-grade audio noise reduction accessible to everyone. It uses state-of-the-art deep learning to isolate speech and remove background noise in real-time from Video and Audio.
            Your files never leave your device. Processing happens on your Device.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Connect</Text>
        <View style={styles.linkContainer}>
          <TouchableOpacity
            style={[theme.Styles.button, styles.linkButton]}
            onPress={() => openLink("https://github.com/sayampy/deepdenoiser")}
          >
            <Feather name="github" size={20} color={theme.COLORS.background} />
            <Text style={[theme.Styles.buttonText, { marginLeft: 10 }]}>GitHub Repo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[theme.Styles.button, theme.Styles.buttonSecondary, styles.linkButton]}
            onPress={() => openLink("https://donate.in/")}
          >
            <Feather name="user" size={20} color={theme.COLORS.primary} />
            <Text style={[theme.Styles.buttonText, theme.Styles.buttonTextSecondary, { marginLeft: 10 }]}>Donate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ by Sayam</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Feather name={icon} size={24} color={theme.COLORS.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureItem: {
    width: '48%',
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
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 24,
  },
  footerText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.small,
  },
});
