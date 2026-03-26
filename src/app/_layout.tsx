import { COLORS, FONT_SIZE, Styles } from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need here
        // For now just artificial delay to simulate loading or permission check
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  // Handle Permissions
  if (!permissionResponse) {
    // Permission response is still loading
    return (
      <View style={[Styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permissionResponse.granted) {
    return (
      <View style={[Styles.container, styles.centered]}>
        <Feather
          name="shield-off"
          size={64}
          color={COLORS.error}
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.permissionTitle}>Permissions Required</Text>
        <Text style={styles.permissionSubtitle}>
          DeepDenoiser needs access to your media library to import and save
          audio files.
        </Text>
        <TouchableOpacity style={Styles.button} onPress={requestPermission}>
          <Text style={Styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">

        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="processing" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  permissionTitle: {
    fontSize: FONT_SIZE.heading,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
  },
  permissionSubtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.subtext,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
});
