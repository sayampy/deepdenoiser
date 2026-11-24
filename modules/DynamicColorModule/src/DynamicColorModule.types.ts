export interface WallpaperSeeds {
  primary: string;
  secondary: string;
  tertiary: string;
}

export type DynamicPaletteMap = Record<string, string>;

export type DynamicColorModuleEvents = {
  onWallpaperColorsChanged: () => void;
};
