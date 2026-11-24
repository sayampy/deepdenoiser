import { Directory, File } from "expo-file-system";
import { saveFileToTree } from "@/modules/AudioProcessorModule";
import { getSettings, updateSettings } from "./settings";
import { mimeForFile } from "./audioExport";

export type SaveCategory = {
  kind: "Original" | "Denoised";
  media: "Audio" | "Video";
};

export async function chooseSaveDirectory(): Promise<string | null> {
  const { saveDirectoryUri } = await getSettings();
  try {
    const directory = await Directory.pickDirectoryAsync(saveDirectoryUri ?? undefined);
    await updateSettings({ saveDirectoryUri: directory.uri });
    return directory.uri;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return null;
    throw error;
  }
}

export async function clearSaveDirectory(): Promise<void> {
  await updateSettings({ saveDirectoryUri: null });
}

export function getSaveDirectoryName(uri: string | null): string | null {
  if (!uri) return null;
  try {
    const treeId = uri.match(/\/tree\/([^/?]+)/)?.[1];
    if (treeId) {
      const path = decodeURIComponent(treeId).split(":").at(-1) ?? "";
      const name = path.split("/").filter(Boolean).at(-1);
      if (name) return name;
    }
    return new Directory(uri).name;
  } catch {
    return uri.split("/").filter(Boolean).at(-1) ?? uri;
  }
}

export async function saveToChosenDirectory(
  file: File,
  category: SaveCategory,
): Promise<boolean> {
  const { saveDirectoryUri } = await getSettings();
  if (!saveDirectoryUri) return false;

  const savedUri = await saveFileToTree(
    file.uri,
    saveDirectoryUri,
    [category.kind, category.media],
    file.name,
    mimeForFile(file),
  );
  if (!savedUri) throw new Error("The saved file could not be verified.");
  return true;
}
