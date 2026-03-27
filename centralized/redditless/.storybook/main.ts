import type { StorybookConfig } from '@storybook/nextjs-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  "stories": [
    "../components/**/*.mdx",
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ],
  viteFinal: (config) => {
    config.plugins = [tailwindcss(), ...(config.plugins ?? [])];
    
    // Define React as external to prevent bundling issues
    config.define = {
      ...config.define,
      global: 'globalThis',
    };
    
    return config;
  },
};
export default config;
