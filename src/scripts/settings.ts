import { File, Paths } from "expo-file-system";

export type ThemePalette = "cyan" | "ocean" | "emerald" | "violet" | "amber";
export type ThemeMode = "system" | "light" | "dark";
export type AudioExportFormat = "wav" | "mp3" | "m4a";
export type VideoExportFormat = "original" | "compressed";

export interface AppSettings {
  analytics: boolean;
  crashlytics: boolean;
  checkForUpdates: boolean;
  donationReminder: boolean;
  denoiseCount: number;
  lastDonationPromptDate: string;
  selectedModel: string;
  /** Model used most recently, retained so a delete never strands the app. */
  lastUsedModel: string;
  modelConsentAsked: boolean;
  saveDirectoryUri: string | null;
  /** Preferred microphone device id; null means the system default. */
  preferredMicDeviceId?: string | null;
  /** Format used when saving audio to the device. */
  exportFormat: AudioExportFormat;
  /** MP3 bitrate in kbps (96, 128, 192, 256 or 320). */
  mp3Bitrate: number;
  /** AAC / M4A bitrate in kbps (96, 128, 192 or 256). */
  m4aBitrate: number;
  /** Format used when saving video to the device. */
  videoExportFormat: VideoExportFormat;
  /** Whether to use Android 12+ wallpaper dynamic colors (Material You). */
  useSystemTheme: boolean;
  /** Static theme fallback palette when dynamic colors are off. */
  themePalette: ThemePalette;
  /** Light / dark / follow-system appearance. */
  themeMode: ThemeMode;
}

const SETTINGS_FILE_NAME = "app_settings.json";

const DEFAULT_SETTINGS: AppSettings = {
  analytics: true,
  crashlytics: true,
  checkForUpdates: true,
  donationReminder: true,
  denoiseCount: 0,
  lastDonationPromptDate: "",
  selectedModel: "deepfilternet3",
  lastUsedModel: "deepfilternet3",
  modelConsentAsked: false,
  saveDirectoryUri: null,
  preferredMicDeviceId: null,
  exportFormat: "wav",
  mp3Bitrate: 128,
  m4aBitrate: 192,
  videoExportFormat: "original",
  useSystemTheme: true,
  themePalette: "cyan",
  themeMode: "system",
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

// Settings are one JSON file, so read-modify-write must be serialized: two
// concurrent updates could otherwise both read the same snapshot and lose one.
let writeQueue: Promise<unknown> = Promise.resolve();

export function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const task = writeQueue.then(async () => {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    try {
      const file = new File(Paths.document, SETTINGS_FILE_NAME);
      if (!file.exists) {
        file.create();
      }
      await file.write(JSON.stringify(updatedSettings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    return updatedSettings;
  });
  writeQueue = task.catch(() => {});
  return task;
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
