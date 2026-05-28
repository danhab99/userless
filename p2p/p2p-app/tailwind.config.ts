import type { Config } from 'tailwindcss'
import { base16Tailwind } from '@donovanglover/base16-tailwind'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../ui-components/src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    { pattern: /bg-/ },
    { pattern: /text-/ },
    { pattern: /border-/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [base16Tailwind({ extendOnly: true })],
} satisfies Config
