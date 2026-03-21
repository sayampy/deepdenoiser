import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Modal,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={theme.Styles.container}>
      <ScrollView
        contentContainerStyle={theme.Styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={theme.Styles.header}>
          <Text style={theme.Styles.title}>About DeepDenoiser</Text>
          <Text style={theme.Styles.subtitle}>Version 1.0.0</Text>
        </View>

        <View style={[theme.Styles.card, styles.infoCard]}>
          <Text style={styles.cardTitle}>What is DeepDenoiser</Text>
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
              source={require("@assets/images/heart-india_emoji.png")}
              style={{
                width: 20,
                height: 20,
              }}
            />{" "}
            by Sayam
          </Text>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Support Development</Text>

              <TouchableOpacity
                style={styles.donationButton}
                onPress={() => openLink("https://ko-fi.com/sayampy")}
              >
                <Image
                  source={require("@/assets/images/support_me_on_kofi.png")}
                  style={styles.kofiImage}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.donationButton, styles.upiButton]}
                onPress={() => openLink("https://donate.in/")}
              >
                <Image
                  source={require("@/assets/images/upi-logo.png")}
                  style={styles.upiIcon}
                />
                <Text style={styles.upiText}>Donate via UPI</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  theme.Styles.button,
                  theme.Styles.buttonSecondary,
                  styles.closeButton,
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[
                    theme.Styles.buttonText,
                    theme.Styles.buttonTextSecondary,
                  ]}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// function FeatureItem({
//   icon,
//   title,
//   description,
// }: {
//   icon: any;
//   title: string;
//   description: string;
// }) {
//   return (
//     <View style={styles.featureItem}>
//       <View style={styles.featureIconContainer}>
//         <Feather name={icon} size={24} color={theme.COLORS.primary} />
//       </View>
//       <Text style={styles.featureTitle}>{title}</Text>
//       <Text style={styles.featureDescription}>{description}</Text>
//     </View>
//   );
// }

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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "700",
    color: theme.COLORS.text,
    marginBottom: 24,
  },
  donationButton: {
    width: "100%",
    height: 56,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  kofiImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  upiButton: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 12, // Match rounded aesthetic of app
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    flexDirection: "row",
    height: 56, // Enforce same height as kofi button area
  },
  upiIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    resizeMode: "contain",
  },
  upiText: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "600",
    color: theme.COLORS.text,
  },
  closeButton: {
    width: "100%",
    marginTop: 8,
  },
});
