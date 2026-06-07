import { File, Paths } from "expo-file-system";

export interface AppSettings {
  analytics: boolean;
  crashlytics: boolean;
  checkForUpdates: boolean;
  donationReminder: boolean;
  denoiseCount: number;
  lastDonationPromptDate: string;
}

const SETTINGS_FILE_NAME = "app_settings.json";

const DEFAULT_SETTINGS: AppSettings = {
  analytics: true,
  crashlytics: true,
  checkForUpdates: true,
  donationReminder: true,
  denoiseCount: 0,
  lastDonationPromptDate: "",
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const file = new File(Paths.document, SETTINGS_FILE_NAME);
    if (!file.exists) {
      return DEFAULT_SETTINGS;
    }
    const content = await file.text();
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
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

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function incrementDenoiseCount(): Promise<void> {
  const settings = await getSettings();
  await updateSettings({ denoiseCount: settings.denoiseCount + 1 });
}

export async function shouldShowDonationReminder(): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.donationReminder) return false;
  if (settings.denoiseCount <= 1) return true;
  if (settings.denoiseCount % 4 === 0) return true;
  if (settings.lastDonationPromptDate !== todayDateString()) return true;
  return false;
}

export async function markDonationPromptShown(): Promise<void> {
  await updateSettings({ lastDonationPromptDate: todayDateString() });
}
