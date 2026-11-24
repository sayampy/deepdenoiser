import { init, trackEvent } from "@aptabase/react-native";
import { getSettings } from "./settings";

let isInitialized = false;

const APTABASE_APP_KEY = "A-EU-5330967073";

/**
 * Only a small set of anonymous product metrics is reported. Errors, stack
 * traces, filenames and internal cache diagnostics are intentionally NOT sent
 * — those stay on the device and are shown in the app's error dialog instead.
 */
export type AnalyticsEvent =
  | "denoise_complete"
  | "start_recording"
  | "save_file"
  | "share_file";

export const initAnalytics = async () => {
  if (isInitialized) return;
  const settings = await getSettings();
  if (settings.analytics) {
    try {
      init(APTABASE_APP_KEY);
      isInitialized = true;
    } catch (e) {
      console.warn("Failed to initialize analytics:", e);
    }
  }
};

export const trackAppEvent = async (
  name: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
) => {
  try {
    const settings = await getSettings();
    if (!settings.analytics) return;
    if (!isInitialized) await initAnalytics();
    if (isInitialized) trackEvent(name, props);
  } catch (e) {
    // Analytics must never affect the feature being measured.
    console.warn("Tracking event failed:", e);
  }
};
