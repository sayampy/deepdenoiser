import { File, Paths } from "expo-file-system";

export interface AppSettings {
  analytics: boolean;
  crashlytics: boolean;
}

const SETTINGS_FILE_NAME = "app_settings.json";

const DEFAULT_SETTINGS: AppSettings = {
  analytics: true,
  crashlytics: true,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const file = new File(Paths.document, SETTINGS_FILE_NAME);
    if (!file.exists) {
      return DEFAULT_SETTINGS;
    }
    const content = await file.text();
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  try {
    const file = new File(Paths.document, SETTINGS_FILE_NAME);
    if (!file.exists) {
      file.create();
    }
    await file.write(JSON.stringify(updatedSettings));
    return updatedSettings;
  } catch (error) {
    console.error("Error saving settings:", error);
    return updatedSettings;
  }
}
