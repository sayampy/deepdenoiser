import { FONT_SIZE } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Use the context palette directly: React Navigation otherwise keeps the
  // first colors it saw when the tab bar was mounted.
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.subtext,
        tabBarLabelStyle: {
          fontSize: FONT_SIZE.xsmall,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="home"
              color={typeof color === "string" ? color : palette.subtext}
              size={focused ? 22 : 20}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="info"
              color={typeof color === "string" ? color : palette.subtext}
              size={focused ? 22 : 20}
            />
          ),
        }}
      />
    </Tabs>
  );
}
