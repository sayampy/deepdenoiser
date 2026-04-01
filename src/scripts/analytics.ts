import { init, trackEvent } from "@aptabase/react-native";
import { getSettings } from "./settings";

let isInitialized = false;

// Note: Replace with actual Aptabase App Key
const APTABASE_APP_KEY = "A-EU-5330967073";

export const initAnalytics = async () => {
  if (isInitialized) return;
  const settings = await getSettings();
  if (settings.analytics || settings.crashlytics) {
    try {
      init(APTABASE_APP_KEY);
      isInitialized = true;
      console.debug("Analytics initialized");
    } catch (e) {
      console.warn("Failed to initialize analytics:", e);
    }
  }
};

export const trackAppEvent = async (name: string, props?: Record<string, any>) => {
  try {
    const settings = await getSettings();
    if (settings.analytics) {
      if (!isInitialized) await initAnalytics();
      if (isInitialized) {
        trackEvent(name, props);
      }
    }
  } catch (e) {
    console.error("Tracking event failed:", e);
  }
};

export const trackAppError = async (error: Error, info?: any) => {
  try {
    const settings = await getSettings();
    if (settings.crashlytics) {
      if (!isInitialized) await initAnalytics();
      if (isInitialized) {
        trackEvent("error", {
          message: error.message,
          stack: error.stack ?? "",
          info: info ? JSON.stringify(info) : ""
        });
      }
    }
  } catch (e) {
    console.error("Tracking error failed:", e);
  }
};
