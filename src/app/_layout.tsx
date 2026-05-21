import UpdateModal from "@/src/components/UpdateModal";
import { COLORS, FONT_SIZE, Styles } from "@/src/constants/theme";
import { initAnalytics, trackAppEvent } from "@/src/scripts/analytics";
import { Feather } from "@expo/vector-icons";
import * as Audio from "expo-audio";
import { useFonts } from "expo-font";
import * as MediaLibrary from "expo-media-library";
import { createPermissionHook } from "expo-modules-core";
import { Stack } from "expo-router";
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
import {
  SafeAreaProvider
} from "react-native-safe-area-context";


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const useMicrophonePermissions = createPermissionHook({
  getMethod: Audio.getRecordingPermissionsAsync,
  requestMethod: Audio.requestRecordingPermissionsAsync,
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [mediaPermissionResponse, requestMediaPermission] = MediaLibrary.usePermissions();
  const [micPermissionResponse, requestMicPermission] = useMicrophonePermissions();

  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
  });

  // Analytics — run once on mount
  useEffect(() => {
    (async () => {
      try {
        await initAnalytics();
        await trackAppEvent("app_open");
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  // Splash — hide when fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppIsReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!appIsReady && !fontError) {
    return null;
  }

  // Handle Permissions
  if (!mediaPermissionResponse || !micPermissionResponse) {
    // Permission response is still loading
    return (
      <View style={[Styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const allPermissionsGranted = mediaPermissionResponse.granted && micPermissionResponse.granted;

  if (!allPermissionsGranted) {
    const handleRequestPermissions = async () => {
      if (!mediaPermissionResponse.granted) {
        await requestMediaPermission();
      }
      if (!micPermissionResponse.granted) {
        await requestMicPermission();
      }
    };

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
          audio files, and microphone access for voice recording and real-time denoising.
        </Text>
        <TouchableOpacity style={Styles.button} onPress={handleRequestPermissions}>
          <Text style={Styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">

        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="processing" />
      </Stack>
      <UpdateModal />
    </SafeAreaProvider>
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
