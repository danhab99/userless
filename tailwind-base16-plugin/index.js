import plugin from "tailwindcss/plugin";
import { DEFAULT_BASE16, BASE16_THEMES } from "./themes.js";

function normalizeTheme(theme) {
  return {
    ...DEFAULT_BASE16,
    ...theme,
  };
}

export function createBase16Plugin(options = {}) {
  const themes = options.themes ?? BASE16_THEMES;
  const defaultTheme = options.defaultTheme ?? Object.keys(themes)[0] ?? "atelier-dune";
  const classPrefix = options.classPrefix ?? "c";
  const selectorAttribute = options.selectorAttribute ?? "data-base16-theme";

  const normalizedThemes = Object.fromEntries(
    Object.entries(themes).map(([name, theme]) => [name, normalizeTheme(theme)]),
  );

  const defaultPalette =
    normalizedThemes[defaultTheme] ??
    normalizeTheme(options.palette ?? {});

  const baseRules = {
    ":root": Object.fromEntries(
      Object.entries(defaultPalette).map(([token, color]) => [`--${token}`, color]),
    ),
  };

  for (const [name, palette] of Object.entries(normalizedThemes)) {
    baseRules[`[${selectorAttribute}="${name}"]`] = Object.fromEntries(
      Object.entries(palette).map(([token, color]) => [`--${token}`, color]),
    );
  }

  return plugin(({ addBase, addUtilities }) => {
    addBase(baseRules);

    const textUtilities = Object.fromEntries(
      Object.keys(defaultPalette).map((token) => {
        const suffix = token.replace("base", "");
        return [`.${classPrefix}${suffix}`, { color: `var(--${token})` }];
      }),
    );

    addUtilities(textUtilities);
  });
}

export default createBase16Plugin;
export { DEFAULT_BASE16, BASE16_THEMES };
