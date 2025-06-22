import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme': {
          'gold': '#FFD700',
          'dark-gold': '#B8860B',
          'teal': {
            'light': '#00E5FF',
            DEFAULT: '#00BFA5',
            'dark': '#004D40',
          },
          'charcoal': '#1A1A1A',
          'offwhite': '#E0E0E0',
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
