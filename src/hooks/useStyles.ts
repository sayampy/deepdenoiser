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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(), [palette]);
}
