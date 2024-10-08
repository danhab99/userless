import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme : {
    screens : {
      'sm' : '640px',
      // => @media (min-width: 640px) { ... }

      'md' : '768px',
      // => @media (min-width: 768px) { ... }

      'lg' : '1024px',
      // => @media (min-width: 1024px) { ... }

      'xl' : '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl' : '1536px',
      // => @media (min-width: 1536px) { ... }
    },
    extend : {
      colors : {
        "card" : "#fcff63",
        "background" : "#e0f2fe",
        "username" : "#a970d4",
        "hash" : "#222",
        "sig-working" : "yellow",
        "sig-error" : "red",
        "sig-nomatch" : "orange",
        "sig-revoked" : "purple",
        "sig-success" : "green"
      }
    },
  },
  plugins: [],
};
export default config;
