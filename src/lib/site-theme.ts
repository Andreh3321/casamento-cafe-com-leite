import { useEffect } from "react";
import { paletteTheme } from "./palette-theme";
import type { ColorPalette } from "./workspace";

/** In dark mode only the highlight colors follow the palette; backgrounds and text stay dark-mode. */
const DARK_KEYS = new Set(["--coral", "--gold", "--green"]);

/** Paints the site with a saved palette and restores the original colors on unmount. */
export function useSiteTheme(palette: ColorPalette | undefined, dark = false) {
  const colors = palette?.colors.join(",") ?? "";
  const paletteId = palette?.id ?? "";

  useEffect(() => {
    const theme = paletteTheme(palette?.colors);
    if (!theme) return;
    const root = document.documentElement;
    const previous = new Map<string, string>();
    for (const [name, value] of Object.entries(theme)) {
      if (dark && !DARK_KEYS.has(name)) continue;
      previous.set(name, root.style.getPropertyValue(name));
      root.style.setProperty(name, value);
    }
    return () => {
      for (const [name, value] of previous) {
        if (value) root.style.setProperty(name, value);
        else root.style.removeProperty(name);
      }
    };
  }, [colors, paletteId, dark]);
}
