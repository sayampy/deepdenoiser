import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="about" />
    </Tabs>
  );
}
