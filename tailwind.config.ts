import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        axiom: {
          // Primary brand colour — update to match Axiom Group branding
          blue:  '#1D4ED8',
          dark:  '#0F172A',
          light: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
}

export default config
