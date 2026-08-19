import RoastToast from "@/src/components/RoastToast";
import * as theme from "@/src/constants/theme";
import { updateSettings } from "@/src/scripts/settings";
import { Feather } from "@expo/vector-icons";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DonationReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenDonation: () => void;
}

export default function DonationReminderModal({
  visible,
  onClose,
  onOpenDonation,
}: DonationReminderModalProps) {
  const [neverAgain, setNeverAgain] = useState(false);
  const [showRoast, setShowRoast] = useState(false);

  const handleNeverAgainToggle = async (value: boolean) => {
    setNeverAgain(value);
    if (value) {
      await updateSettings({ donationReminder: false });
      onClose();
      setShowRoast(true);
    }
  };

  const handleDonate = () => {
    onClose();
    onOpenDonation();
  };

  return (
    <>
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
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={22} color={theme.COLORS.subtext} />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Feather name="heart" size={28} color={theme.COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>Support the Project</Text>
            <Text style={styles.modalSubtitle}>
              Keep it open-source and ad-free forever
            </Text>

            <View style={styles.quoteContainer}>
              <Text style={styles.quoteText}>
                Even a modest donation goes a long way toward keeping this project alive and actively maintained.
              </Text>
            </View>

            <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
              <Feather
                name="coffee"
                size={20}
                color={theme.COLORS.background}
              />
              <Text style={styles.donateButtonText}>Buy Me a Coffee</Text>
            </TouchableOpacity>

            <View style={styles.neverAgainRow}>
              <Text style={styles.neverAgainText}>Never show again</Text>
              <Host matchContents colorScheme="dark">
                <Switch
                  value={neverAgain}
                  onCheckedChange={handleNeverAgainToggle}
                  colors={{
                    uncheckedTrackColor: theme.COLORS.border,
                    checkedTrackColor: theme.COLORS.primary + "60",
                    checkedThumbColor: theme.COLORS.primary,
                    uncheckedThumbColor: theme.COLORS.subtext,
                  }}
                />
              </Host>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <RoastToast
        visible={showRoast}
        message="May you be drowning in money in future 💸"
        onHide={() => setShowRoast(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  modalTitle: {
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "800",
    color: theme.COLORS.text,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.primary,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  quoteContainer: {
    backgroundColor: theme.COLORS.background,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    width: "100%",
    borderLeftWidth: 3,
    borderLeftColor: theme.COLORS.primary,
  },
  quoteText: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
    fontStyle: "italic",
    lineHeight: 20,
  },
  donateButton: {
    flexDirection: "row",
    backgroundColor: theme.COLORS.primary,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  donateButtonText: {
    color: theme.COLORS.background,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
  },
  neverAgainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.COLORS.border,
  },
  neverAgainText: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
    fontWeight: "600",
  },
});
