
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
        navy: {
          DEFAULT: "#0D1B3E",
          light: "#1a3070",
          dark: "#08112a",
        },
        gold: {
          DEFAULT: "#C9A84C",
          light: "#e2c070",
          dark: "#9a7a2e",
        },
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
        playfair: ["var(--font-playfair)", "serif"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
