import * as theme from "@/src/constants/theme";
import { Feather } from "@expo/vector-icons"; // Expo's built-in icon library
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  // const params = useLocalSearchParams();
  const [tempFile, setTempFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImportFile = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"], // "video/*"],
        copyToCacheDirectory: true, // Let Expo handle copying to a temporary cache
      });

      if (result.canceled) {
        console.log("User cancelled the document picker.");
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setIsLoading(true);
        console.log("file imported:", result.assets[0]);
        const asset = result.assets[0];
        setTempFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType?.startsWith("audio") ? "Audio" : "Video",
        });
        setIsLoading(false);
      }

      /*  // The file is already in a temporary cache directory provided by the picker.
        // We can use this URI directly or copy it to a more permanent temporary location if needed.
        // For this example, the picker's cache is sufficient.
        const tempUri = asset.uri;
        const fileName = asset.name;
        const fileType = asset.mimeType?.startsWith("audio")
          ? "Audio"
          : "Video";

        // To demonstrate saving, we can copy it to our own defined temporary file path.
        const newTempPath = `${
          FileSystem.cacheDirectory || FileSystem.documentDirectory
        }/${fileName}`;
        await FileSystem.copyAsync({
          from: tempUri,
          to: newTempPath,
        });

        console.log(`File saved to temporary location: ${newTempPath}`);

        setTempFile({
          uri: newTempPath,
          name: fileName,
          type: fileType,
        });
        setIsLoading(false);
      }
      */
    } catch (error) {
      setIsLoading(false);
      Alert.alert(
        "Error",
        "An unexpected error occurred while importing the file."
      );
      console.error("Error importing file:", error);
    }
  };
  const handleProceed = () => {
    setIsLoading(true);
    if (!tempFile) {
      Alert.alert("No File", "Please import a file before proceeding.");
      return;
    }
    // Navigate to the next screen or perform an action with the file
    // Alert.alert("Proceeding", `Processing file: ${tempFile.name}`);
    console.log("Proceeding with file:", tempFile.uri);
    setIsLoading(false);
    router.push({
      pathname: "processing/process",
      params: { fileuri: tempFile.uri },
    });
  };

  return (
    <View style={theme.Styles.container}>
      <View style={theme.Styles.header}>
        <Text style={theme.Styles.title}>Audio Denoiser</Text>
        <Text style={theme.Styles.subtitle}>
          Select an audio or video file to get started
        </Text>
      </View>

      <TouchableOpacity
        style={[
          theme.Styles.button,
          {
            width: "65%",
            paddingVertical: theme.SPACING.medium,
            paddingHorizontal: theme.SPACING.small,
          },
        ]}
        onPress={handleImportFile}
      >
        <Feather
          name="upload-cloud"
          size={24}
          color={theme.COLORS.text}
          style={[theme.Styles.icon, { marginLeft: 15 }]}
        />
        <Text style={[theme.Styles.buttonText, { marginRight: 12 }]}>
          Import Audio / Video
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      )}

      {tempFile && !isLoading && (
        <View style={styles.fileInfoContainer}>
          <Feather
            name={tempFile.type === "Audio" ? "music" : "video"}
            size={40}
            color={theme.COLORS.primary}
          />
          <View style={styles.fileTextContainer}>
            <Text style={styles.fileName} numberOfLines={1}>
              {tempFile.name}
            </Text>
            <Text style={styles.fileType}>{tempFile.type} File</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setTempFile(null);
            }}
            style={{ padding: 5 }}
          >
            <Feather name="x" size={32} color={theme.COLORS.error} />
          </TouchableOpacity>
        </View>
      )}
      {tempFile ? (
        <TouchableOpacity
          style={[
            theme.Styles.button,
            {
              width: "80%",
              paddingVertical: theme.SPACING.medium,
              paddingHorizontal: theme.SPACING.small,
            },
          ]}
          onPress={() => handleProceed()}
          disabled={!tempFile}
        >
          <Text style={theme.Styles.buttonText}>Proceed</Text>
          <Feather name="arrow-right" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
      ) : (
        <View />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* container: {
    flex: 1,
    backgroundColor: "#F4F7F9",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
  },
  importButton: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    // Elevation for Android
    elevation: 8,
  },
  importButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  }, */
  loader: {
    marginVertical: 20,
  },
  fileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.COLORS.secondary,
    borderRadius: 12,
    padding: theme.SPACING.medium,
    width: "100%",
    marginTop: 30,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
  },
  fileTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  fileName: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "500",
    color: "#2C3E50",
  },
  fileType: {
    fontSize: theme.FONT_SIZE.small,
    color: "#7F8C8D",
    marginTop: 4,
  },
  /* proceedButton: {
    flexDirection: "row",
    backgroundColor: "#27AE60",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 5,
  }, */
  /* disabledButton: {
    backgroundColor: "#BDC3C7",
    elevation: 0,
    shadowOpacity: 0,
  },
  proceedButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  }, */
});
