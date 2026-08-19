import licensesData from "@/assets/generated/licenses.json";
import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Host, OutlinedTextField } from "@expo/ui/jetpack-compose";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LicenseInfo {
  licenses: string;
  repository?: string;
  licenseUrl?: string;
  parents?: string;
}

const allLicenses = Object.entries(licensesData as Record<string, LicenseInfo>).map(
  ([name, info]) => ({
    name,
    ...info,
  })
);

export default function LicensesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLicenses = useMemo(() => {
    if (!searchQuery) return allLicenses;
    const query = searchQuery.toLowerCase();
    return allLicenses.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.licenses.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const openLink = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const renderItem = ({ item }: { item: typeof allLicenses[0] }) => (
    <View style={[theme.Styles.card, styles.licenseCard]}>
      <Text style={styles.packageName} numberOfLines={1} ellipsizeMode="tail">
        {item.name}
      </Text>
      <View style={styles.licenseDetails}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.licenses}</Text>
        </View>
        {item.repository && (
          <TouchableOpacity
            onPress={() => openLink(item.repository)}
            style={styles.repoLink}
          >
            <Feather name="github" size={14} color={theme.COLORS.primary} />
            <Text style={styles.repoText}>Source</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={theme.Styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={theme.Styles.title}>Licenses</Text>
      </View>

      <View style={styles.searchContainer}>
        <Host style={{ flex: 1 }} colorScheme="dark">
          <OutlinedTextField
            singleLine
            onValueChange={setSearchQuery}
            keyboardOptions={{ imeAction: "search" }}
            colors={{
              focusedContainerColor: theme.COLORS.surface,
              unfocusedContainerColor: theme.COLORS.surface,
              focusedTextColor: theme.COLORS.text,
              unfocusedTextColor: theme.COLORS.text,
              focusedIndicatorColor: theme.COLORS.primary,
              unfocusedIndicatorColor: theme.COLORS.border,
              focusedPlaceholderColor: theme.COLORS.subtext,
              unfocusedPlaceholderColor: theme.COLORS.subtext,
            }}
          >
            <OutlinedTextField.Placeholder>
              Search libraries...
            </OutlinedTextField.Placeholder>
          </OutlinedTextField>
        </Host>
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={18} color={theme.COLORS.subtext} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredLicenses}
        renderItem={renderItem}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.SPACING.medium,
    marginTop: theme.SPACING.small,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.SPACING.medium,
    height: 56,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    height: "100%",
  },
  listContent: {
    paddingBottom: theme.SPACING.xlarge,
    gap: theme.SPACING.small,
  },
  licenseCard: {
    padding: theme.SPACING.medium,
  },
  packageName: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    color: theme.COLORS.text,
    marginBottom: 8,
  },
  licenseDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  badgeText: {
    fontSize: theme.FONT_SIZE.xsmall,
    color: theme.COLORS.primary,
    fontWeight: "600",
  },
  repoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repoText: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.primary,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.body,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
});
