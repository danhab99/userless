const plugin = require("tailwindcss/plugin");
const { DEFAULT_BASE16, BASE16_THEMES } = require("./themes.cjs");

function normalizeTheme(theme) {
  return {
    ...DEFAULT_BASE16,
    ...theme,
  };
}

function createBase16Plugin(options = {}) {
  const themes = options.themes || BASE16_THEMES;
  const defaultTheme = options.defaultTheme || Object.keys(themes)[0] || "atelier-dune";
  const classPrefix = options.classPrefix || "c";
  const selectorAttribute = options.selectorAttribute || "data-base16-theme";

  const normalizedThemes = Object.fromEntries(
    Object.entries(themes).map(([name, theme]) => [name, normalizeTheme(theme)]),
  );

  const defaultPalette =
    normalizedThemes[defaultTheme] ||
    normalizeTheme(options.palette || {});

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

module.exports = createBase16Plugin;
module.exports.default = createBase16Plugin;
module.exports.createBase16Plugin = createBase16Plugin;
module.exports.DEFAULT_BASE16 = DEFAULT_BASE16;
module.exports.BASE16_THEMES = BASE16_THEMES;
