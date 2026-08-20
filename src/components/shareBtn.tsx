import { trackAppEvent } from "@/src/scripts/analytics";
import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import * as Sharing from "expo-sharing";
import React from "react";
import {
    Alert,
    TouchableOpacity
} from "react-native";

interface ShareBtnProps {
    uri: string;
}
const ShareBtn: React.FC<ShareBtnProps> = ({ uri }) => {
    const handleShare = async () => {
        try {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
                trackAppEvent("share_file");
            } else {
                Alert.alert("Sharing not available", "The sharing service is not available on this device.");
            }
        } catch (error) {
            console.error("Failed to share file:", error);
            Alert.alert("Share Failed", error instanceof Error ? error.message : "Could not share this file.");
        }
    };

    return <TouchableOpacity
        onPress={handleShare}
        activeOpacity={0.7}
    >
        <Feather name="share-2" size={24} color={theme.COLORS.primary} />
    </TouchableOpacity>

}
export default ShareBtn;