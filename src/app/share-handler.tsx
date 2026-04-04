import * as theme from "@/src/constants/theme";
import ErrorModal from "@/src/components/ErrorModal";
import { useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function ShareHandler() {
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads, error: shareError } = useIncomingShare();
  const router = useRouter();
  
  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

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
      } else if (shareError) {
        console.error("Error resolving shared payload:", shareError);
        setError(shareError instanceof Error ? shareError : new Error(String(shareError)));
        setIsErrorModalVisible(true);
      }
    }
  }, [resolvedSharedPayloads, isResolving, shareError]);

  return (
    <View style={[theme.Styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={theme.COLORS.primary} />
      <Text style={styles.loadingText}>
        {isResolving ? "Preparing shared file..." : "Redirecting..."}
      </Text>
      {shareError && <Text style={styles.errorText}>Error: {shareError.message}</Text>}
      
      <ErrorModal 
        visible={isErrorModalVisible}
        error={error}
        onClose={() => {
          setIsErrorModalVisible(false);
          router.replace("/(tabs)");
        }}
      />
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
