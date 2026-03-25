
export function redirectSystemPath({
    path,
    initial,
}: {
    path: string;
    initial: boolean;
}) {
    try {
        // Route any incoming native share launch to your handler screen.
        // Adjust the condition if your build produces a different incoming path.
        if (initial) {
            return "/share-handler";
        }

        return path;
    } catch {
        return "/(tabs)";
    }
}