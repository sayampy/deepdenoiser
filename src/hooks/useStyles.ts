import { useMemo } from "react";

import { useTheme } from "@/src/context/ThemeContext";

/**
 * Rebuild a module-level style factory whenever the active palette changes.
 *
 * `StyleSheet.create` snapshots color values at call time, so simply mutating
 * `COLORS` is not enough. Factories passed here are plain module-scope
 * functions (stable references) and are re-created when the palette object
 * changes.
 */
export function useStyles<T extends Record<string, unknown>>(factory: () => T): T {
  const { palette } = useTheme();
  // Key on the actual color values, not just the object identity: a palette can
  // be recreated with the same colors (or mutated during a theme switch), and
  // styles must still be rebuilt whenever the appearance changes.
  const signature = Object.values(palette).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(), [palette, signature]);
}
