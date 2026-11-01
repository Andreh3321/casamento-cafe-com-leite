import type { ColorPalette, WorkspaceData } from "./workspace";

export type Rgb = { r: number; g: number; b: number };

const PAPER: Rgb = { r: 251, g: 250, b: 246 };
const INK: Rgb = { r: 25, g: 59, b: 66 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(value: unknown): Rgb | null {
  const match = HEX.exec(String(value ?? "").trim());
  if (!match) return null;
  let hex = match[1] ?? "";
  if (hex.length === 3) hex = hex.split("").map(char => char + char).join("");
  const parsed = parseInt(hex, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export const toHex = (color: Rgb) => `#${[color.r, color.g, color.b].map(value => clamp(value).toString(16).padStart(2, "0")).join("")}`;

const mix = (a: Rgb, b: Rgb, amount: number): Rgb => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount,
});

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

export const luminance = (color: Rgb) => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);

export function contrastRatio(a: Rgb | string, b: Rgb | string) {
  const first = typeof a === "string" ? parseHex(a) : a;
  const second = typeof b === "string" ? parseHex(b) : b;
  if (!first || !second) return 1;
  const [high, low] = luminance(first) >= luminance(second) ? [first, second] : [second, first];
  return (luminance(high) + 0.05) / (luminance(low) + 0.05);
}

const darkest = (a: Rgb, b: Rgb) => (luminance(a) <= luminance(b) ? a : b);

/** Darkens a color just enough to stay readable on the page background. */
const readable = (color: Rgb, background: Rgb, minimum: number) => {
  let result = color;
  for (let step = 0; step <= 0.9 && contrastRatio(result, background) < minimum; step += 0.05) {
    result = mix(color, BLACK, step);
  }
  return result;
};

/**
 * Turns a saved palette into the site's color tokens.
 * First color = highlight, second = detail, darkest = text, greenest = support.
 * Anything too light to read is darkened instead of being used as-is.
 */
export function paletteTheme(colors: readonly string[] | undefined | null): Record<string, string> | null {
  const parsed = (colors ?? []).map(parseHex).filter((color): color is Rgb => color !== null);
  if (!parsed.length) return null;

  const accent = parsed[0]!;
  const paper = mix(PAPER, mix(accent, WHITE, 0.5), 0.06);
  const detail = parsed[1] ?? mix(accent, WHITE, 0.45);
  const darkestColor = parsed.reduce(darkest, parsed[0]!);
  const ink = contrastRatio(darkestColor, paper) >= 4.5 ? darkestColor : INK;
  const support = parsed.find(color => color.g >= color.r && color.g >= color.b) ?? mix(ink, accent, 0.5);

  const accentSafe = readable(accent, paper, 3);
  const detailSafe = readable(detail, paper, 3);
  const supportSafe = readable(support, paper, 3);
  const accentSoft = mix(accentSafe, paper, 0.84);
  const line = mix(ink, paper, 0.87);
  const surface = mix(paper, WHITE, 0.72);

  return {
    "--paper": toHex(paper),
    "--background": toHex(paper),
    "--foreground": toHex(ink),
    "--ink": toHex(ink),
    "--ink-soft": toHex(mix(ink, paper, 0.38)),
    "--ink-faint": toHex(mix(ink, paper, 0.58)),
    "--line": toHex(line),
    "--border": toHex(line),
    "--input": toHex(line),
    "--card": toHex(surface),
    "--card-foreground": toHex(ink),
    "--surface": toHex(surface),
    "--sidebar-bg": toHex(mix(paper, ink, 0.05)),
    "--hero-bg": toHex(mix(paper, supportSafe, 0.09)),
    "--nav-hover": toHex(mix(paper, ink, 0.09)),
    "--nav-active": toHex(mix(paper, ink, 0.12)),
    "--muted": toHex(mix(paper, ink, 0.08)),
    "--muted-foreground": toHex(mix(ink, paper, 0.38)),
    "--secondary": toHex(mix(paper, supportSafe, 0.14)),
    "--secondary-foreground": toHex(ink),
    "--accent": toHex(accentSoft),
    "--accent-foreground": toHex(readable(accentSafe, accentSoft, 4.5)),
    "--primary": toHex(ink),
    "--primary-foreground": toHex(mix(paper, WHITE, 0.8)),
    "--ring": toHex(mix(accentSafe, paper, 0.55)),
    "--coral": toHex(accentSafe),
    "--coral-soft": toHex(accentSoft),
    "--coral-deep": toHex(readable(accentSafe, paper, 4.5)),
    "--coral-bg": toHex(mix(accentSafe, paper, 0.92)),
    "--gold": toHex(detailSafe),
    "--gold-soft": toHex(mix(detailSafe, paper, 0.8)),
    "--gold-deep": toHex(readable(detailSafe, paper, 4.5)),
    "--gold-bg": toHex(mix(detailSafe, paper, 0.93)),
    "--green": toHex(supportSafe),
    "--blue-soft": toHex(mix(ink, paper, 0.82)),
    "--blue-deep": toHex(readable(supportSafe, paper, 4.5)),
    "--blue-bg": toHex(mix(supportSafe, paper, 0.9)),
  };
}

/** The palette the site is wearing: only the one the couple marked for it. */
export function resolveSitePalette(data: WorkspaceData): ColorPalette | undefined {
  return data.palettes.find(palette => palette.id === data.sitePaletteId);
}
