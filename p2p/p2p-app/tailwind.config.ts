import type { Config } from 'tailwindcss'
import { base16Tailwind } from '@donovanglover/base16-tailwind'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    {
      pattern: /bg-/g,
    }
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [base16Tailwind()],
} satisfies Config
