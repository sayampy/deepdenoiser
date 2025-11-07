import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// export const unstable_settings = {
//   initialRouteName:"(tabs)"
// };
export function RootLayout() {
  return (
    <SafeAreaView>
      <StatusBar style="dark" />
      <Stack initialRouteName="/index" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="processing" />
      </Stack>
    </SafeAreaView>
  );
}
