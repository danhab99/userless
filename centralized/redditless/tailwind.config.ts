import type { Config } from "tailwindcss";
import tailwindScrollbar from "tailwind-scrollbar";
import createBase16Plugin from "@userless/tailwind-base16-plugin";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@userless/ui-components/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../ui-components/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Remove safelist - let Tailwind v4 auto-detect from source scanning
  theme: {
    screens: {
      sm: "640px",
      // => @media (min-width: 640px) { ... }

      md: "768px",
      // => @media (min-width: 768px) { ... }

      lg: "1024px",
      // => @media (min-width: 1024px) { ... }

      xl: "1280px",
      // => @media (min-width: 1280px) { ... }

      "2xl": "1536px",
      // => @media (min-width: 1536px) { ... }
    },
  },
  plugins: [
    tailwindScrollbar,
    createBase16Plugin(),
  ],
};
export default config;
