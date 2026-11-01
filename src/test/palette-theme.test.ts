import { describe, expect, it } from 'vitest';
import { contrastRatio, paletteTheme, resolveSitePalette } from '@/lib/palette-theme';
import { normalizeWorkspace } from '@/lib/workspace';

const palette = (id: string, colors: string[], favorite = false) => ({ id, name: `Paleta ${id}`, colors, favorite });
const workspace = (palettes: ReturnType<typeof palette>[], sitePaletteId: string | null) =>
  normalizeWorkspace({ palettes, sitePaletteId });

describe('Site theme from palettes', () => {
  it('ignores palettes without usable colors', () => {
    expect(paletteTheme([])).toBeNull();
    expect(paletteTheme(['banana', ''])).toBeNull();
    expect(paletteTheme(undefined)).toBeNull();
  });

  it('uses the first color as the site highlight', () => {
    const theme = paletteTheme(['#c86b52', '#193b42', '#d5a94b'])!;
    expect(theme['--coral']?.toLowerCase()).toBe('#c86b52');
  });

  it('darkens a highlight that is too light to read', () => {
    const theme = paletteTheme(['#fff8c9'])!;
    expect(contrastRatio(theme['--coral']!, theme['--paper']!)).toBeGreaterThanOrEqual(3);
    expect(theme['--coral']?.toLowerCase()).not.toBe('#fff8c9');
  });

  it('only lets a palette color become the text color when it is dark enough', () => {
    expect(paletteTheme(['#c86b52'])!['--ink']).toBe('#193b42');
    expect(paletteTheme(['#c86b52', '#12232e'])!['--ink']).toBe('#12232e');
  });

  it('keeps every generated color as a readable hex value', () => {
    const theme = paletteTheme(['#ffe9f0', '#f7d9a0'])!;
    for (const [name, value] of Object.entries(theme)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('picks the chosen palette, then the favorite, then the first', () => {
    const palettes = [palette('a', ['#c86b52']), palette('b', ['#193b42'], true), palette('c', ['#d5a94b'])];
    expect(resolveSitePalette(workspace(palettes, 'c'))?.id).toBe('c');
    expect(resolveSitePalette(workspace(palettes, null))?.id).toBe('b');
    expect(resolveSitePalette(workspace([palette('a', ['#c86b52']), palette('c', ['#d5a94b'])], null))?.id).toBe('a');
    expect(resolveSitePalette(workspace([], null))).toBeUndefined();
  });

  it('keeps the chosen palette across a saved workspace reload', () => {
    const saved = JSON.parse(JSON.stringify(workspace([palette('a', ['#c86b52']), palette('b', ['#193b42'])], 'b')));
    expect(normalizeWorkspace(saved).sitePaletteId).toBe('b');
    expect(resolveSitePalette(normalizeWorkspace(saved))?.id).toBe('b');
  });

  it('falls back to the favorite when the chosen palette was deleted', () => {
    const data = normalizeWorkspace({ palettes: [palette('b', ['#193b42'], true)], sitePaletteId: 'gone' });
    expect(resolveSitePalette(data)?.id).toBe('b');
  });
});
