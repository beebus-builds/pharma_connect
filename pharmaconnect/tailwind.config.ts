import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff9f6",
          100: "#d6f0e7",
          200: "#ade0cf",
          300: "#7dccb4",
          400: "#4bb096",
          500: "#2f9480",
          600: "#217a69",
          700: "#1c6256",
          800: "#194f46",
          900: "#17423b",
        },
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
