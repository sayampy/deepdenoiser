import AudioPlayer from "@/src/components/audioPlayer";
import { File } from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
export default function ProcessScreen() {
  const router = useRouter();
  const { fileuri } = useLocalSearchParams<{ fileuri: string }>();
  const [tempFile, setTempFile] = React.useState<File | null>(null);
  useEffect(() => {
    if (!fileuri) {
      router.navigate("/");
    } else {
      setTempFile(new File(fileuri));
    }
  }, [fileuri, router]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ready to Process</Text>
      <Text style={styles.subtitle}>
        This is the next page. You can now proceed with further actions using
        the imported file.
      </Text>
      {tempFile && <AudioPlayer uri={tempFile.uri} />}
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        onPress={() => router.back()}
      >
        <Text style={styles.btnText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "black",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#383b3eff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  btn: {
    backgroundColor: "#2271e0ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "center",
    minWidth: 160,
  },
  pressed: { opacity: 0.9 },
  btnText: { color: "black", fontWeight: "700" },
});
