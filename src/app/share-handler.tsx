import * as theme from "@/src/constants/theme";
import { useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function ShareHandler() {
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads, error } = useIncomingShare();
  const router = useRouter();

  useEffect(() => {
    if (!isResolving) {
      if (resolvedSharedPayloads.length > 0) {
        const payload = resolvedSharedPayloads[0];
        // In expo-sharing SDK 55, payload has contentUri, originalName, contentType
        if (payload.contentUri) {
          console.log("Processing shared content:", payload.contentUri);

          // Navigate to processing screen
          router.replace({
            pathname: "/processing/process",
            params: {
              fileuri: payload.contentUri,
              filename: (payload.originalName || "shared_file")
            },
          });

          // Clear shared payloads to avoid reprocessing
          clearSharedPayloads();
        } else {
          console.warn("Shared payload has no contentUri");
          router.replace("/(tabs)");
        }
      } else if (error) {
        console.error("Error resolving shared payload:", error);
        router.replace("/(tabs)");
      }
    }
  }, [resolvedSharedPayloads, isResolving, error]);

  return (
    <View style={[theme.Styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={theme.COLORS.primary} />
      <Text style={styles.loadingText}>
        {isResolving ? "Preparing shared file..." : "Redirecting..."}
      </Text>
      {error && <Text style={styles.errorText}>Error: {error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.text,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.error,
    textAlign: "center",
  },
});
