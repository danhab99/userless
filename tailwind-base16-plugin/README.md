# @userless/tailwind-base16-plugin

Reusable Tailwind plugin that:

- injects Base16 CSS variables (`--base00` to `--base0f`) on `:root`
- creates text utility classes (`.c00` to `.c0f`) by default
- supports multiple named themes switchable via HTML attribute

## Usage

```ts
import createBase16Plugin from "@userless/tailwind-base16-plugin";

export default {
  plugins: [createBase16Plugin()],
};
```

Default runtime switch attribute:

```html
<html data-base16-theme="atelier-dune">
```

Built-in themes are exported from:

```ts
import { BASE16_THEMES, BASE16_THEME_NAMES } from "@userless/tailwind-base16-plugin/themes";
```

## Options

```ts
createBase16Plugin({
  classPrefix: "c", // default
  defaultTheme: "atelier-dune", // default: first theme key
  selectorAttribute: "data-base16-theme", // default
  themes: {
    custom: {
      base00: "#000000",
      // ...override any baseXX token
    },
  },
});
```
