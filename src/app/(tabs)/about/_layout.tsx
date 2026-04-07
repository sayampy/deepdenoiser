import { Stack } from "expo-router";
import React from "react";
import * as theme from "@/src/constants/theme";

export default function AboutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.COLORS.background },
      }}
    />
  );
}
