import * as theme from "@/src/constants/theme";
import * as fs from "expo-file-system";
import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function ShareReceived() {
    const { isReady, hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();
    const router = useRouter();

    useEffect(() => {
        if (!hasShareIntent) {
            router.replace("/(tabs)")
            // resetShareIntent();
            return;
        };
        if (!isReady) return;
        console.log("shareIntent", shareIntent);
        const payload = shareIntent.files?.[0];
        if (payload) {
            const processSharedFile = async () => {
                try {
                    const uri = payload.path;
                    const file = new fs.File(uri);
                    const fileName = file.name ?? `shared_${Date.now()}`;
                    const destFile = new fs.File(fs.Paths.cache, fileName);
                    // if (destFile.exists) { destFile.delete() }
                    // if (file.exists) file.copy(fs.Paths.cache);
                    resetShareIntent();
                    router.replace({
                        pathname: "/processing/process",
                        params: {
                            fileuri: file.uri,
                            filename: fileName.split('.').slice(0, -1).join('.')
                        },
                    });
                } catch (error) {
                    console.log("error", error);
                    resetShareIntent()
                    console.error("Failed to process shared file", error);
                }
            };
            processSharedFile();
        }
    }, [shareIntent, isReady]);

    return (
        <View style={[theme.Styles.container, theme.Styles.centered]} >
            <ActivityIndicator size="large" color={theme.COLORS.primary} />
            {!hasShareIntent && <Text>No Share Intent</Text>}
        </View>
    );
}