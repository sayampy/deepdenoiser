import { useShareIntent } from "expo-share-intent";
import { ActivityIndicator, View } from "react-native";
import * as theme from "@/src/constants/theme";
import * as fs from "expo-file-system";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function ShareReceived() {
    const { isReady, hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
    const router = useRouter();

    useEffect(() => {
        if (!isReady && !hasShareIntent) return;

        const payload = shareIntent.files?.[0];
        if (payload) {
            const processSharedFile = async () => {
                try {
                    const uri = payload.path;
                    const file = new fs.File(uri);
                    const fileName = file.name ?? `shared_${Date.now()}`;

                    file.copy(fs.Paths.cache);

                    router.replace({
                        pathname: "/processing/process",
                        params: {
                            fileuri: file.uri,
                            filename: fileName.split('.').slice(0, -1).join('.')
                        },
                    });
                } catch (error) {
                    console.error("Failed to process shared file", error);
                }
            };
            processSharedFile();
        }
    }, [shareIntent, isReady, router]);

    return (
        <View style={[theme.Styles.container, theme.Styles.centered]} >
            <ActivityIndicator size="large" color={theme.COLORS.primary} />
        </View>
    );
}