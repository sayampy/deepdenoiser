import { NativeModule, requireNativeModule } from "expo";

import type {
  DynamicColorModuleEvents,
  DynamicPaletteMap,
  WallpaperSeeds,
} from "./DynamicColorModule.types";

declare class DynamicColorModule extends NativeModule<DynamicColorModuleEvents> {
  getDynamicPalette(isDark: boolean): Promise<DynamicPaletteMap | null>;
  getWallpaperSeedColors(): Promise<WallpaperSeeds | null>;
  setSystemBarTone(color: string, isDark: boolean): Promise<boolean>;
}

export default requireNativeModule<DynamicColorModule>("DynamicColorModule");
