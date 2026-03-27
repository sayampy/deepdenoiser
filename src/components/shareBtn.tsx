import * as theme from "@/src/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import * as Sharing from "expo-sharing";
import React from "react";
import {
    StyleSheet,
    TouchableOpacity
} from "react-native";

interface ShareBtnProps {
    uri: string;
}
const ShareBtn: React.FC<ShareBtnProps> = ({ uri }) => {
    const handleShare = async () => {
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        }
    };

    return <TouchableOpacity
        onPress={handleShare}
        activeOpacity={0.7}
    >
        <Feather name="share-2" size={24} color={theme.COLORS.primary} />
    </TouchableOpacity>

}
const styles = StyleSheet.create({
    galleryButton: {
        // flexDirection: "row",
        // alignItems: "center",
        // color: theme.COLORS.primary,
        // paddingVertical: 8,
        // paddingHorizontal: 16,
        // borderRadius: 12,
        // gap: 6,
    },
}
)
export default ShareBtn;