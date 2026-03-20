import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        username: "#a970d4", 
        card: "#fcff63",
        hash: "#222",
      }
    },
  },
  plugins: [],
};

export default config;