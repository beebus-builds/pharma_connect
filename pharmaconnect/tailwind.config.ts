import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        paper: "#FAF7F1",
        ink: "#1C1917",
        primary: {
          50: "#eef6f2",
          100: "#d7eae1",
          200: "#b0d5c5",
          300: "#7fb9a3",
          400: "#4d987f",
          500: "#2c7c65",
          600: "#1d6353",
          700: "#175e4c",
          800: "#144e40",
          900: "#123f35",
          950: "#0a2922",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgb(28 25 23 / 0.05)",
        "card-hover": "0 2px 8px rgb(28 25 23 / 0.08)",
        popover: "0 12px 32px -12px rgb(28 25 23 / 0.25)",
        overlay: "0 24px 64px -16px rgb(28 25 23 / 0.35)",
      },
      borderRadius: {
        // System scale: prefer rounded-lg (0.5rem) for controls,
        // rounded-xl (0.75rem) for inputs, rounded-2xl (1rem) for cards.
        // xl2/xl3 kept for backwards-compat only — do not use in new code.
        xl2: "1rem",
        xl3: "1.25rem",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.5s ease-in-out infinite",
        fadeIn: "fadeIn 0.5s ease-out",
        slideUp: "slideUp 0.5s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
