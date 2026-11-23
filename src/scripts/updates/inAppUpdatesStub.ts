// GitHub/dev builds must not ship Play Core: those builds self-update from a
// GitHub release APK via the system installer. Metro aliases
// `@app/in-app-updates` here outside Play Store builds, and a config plugin
// excludes the native module from autolinking.

export type UpdateCheckResult = {
  updateAvailable: boolean;
  storeVersion: string;
};

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  return { updateAvailable: false, storeVersion: "" };
}

export async function startUpdate(_isImmediate?: boolean): Promise<boolean> {
  return false;
}
