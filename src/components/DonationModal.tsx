import * as theme from "@/src/constants/theme";
import * as Linking from "expo-linking";
import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DonationModal({ visible, onClose }: DonationModalProps) {
  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
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
            onPress={() =>
              openLink("upi://pay?pa=sayampy.code@oksbi&pn=Sayampy&cu=INR")
            }
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
            onPress={onClose}
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
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "orange",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    height: 56,
  },
  upiIcon: {
    height: 20,
    marginRight: 5,
    resizeMode: "contain",
  },
  upiText: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "600",
    color: theme.COLORS.surface,
    marginRight: 25,
  },
  closeButton: {
    width: "100%",
    marginTop: 8,
  },
});
