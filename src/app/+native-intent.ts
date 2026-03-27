export function redirectSystemPath({
    path,
    initial,
}: {
    path: string;
    initial: boolean;
}) {
    try {
        // Check if the incoming path is from expo-sharing
        // This can be via a custom scheme like expo-sharing:// or a deep link
        if (path.includes("expo-sharing")) {
            return "/share-handler";
        }

        // Default path handling
        return path;
    } catch (e) {
        // If everything fails, fallback to home
        return "/(tabs)";
    }
}
