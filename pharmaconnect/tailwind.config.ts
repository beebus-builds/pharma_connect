import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Design tokens.
 *
 * Surfaces, text, hairlines and the accent ramp are CSS custom properties so a
 * single `.dark` class re-themes the whole product. Components then read
 * `bg-surface` / `text-muted` / `border-line` instead of pairing a light palette
 * with a hand-written `dark:` twin for every single declaration — which is what
 * had drifted out of sync across the codebase (stone-200 vs slate-800 vs
 * border-slate-200, with no rule for which was correct).
 *
 * Every token is exposed as `rgb(var(--token) / <alpha-value>)` so Tailwind's
 * opacity modifiers (`bg-surface/60`) keep working.
 */
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

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
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Semantic layer — theme-aware.
        canvas: token("--canvas"),
        surface: {
          DEFAULT: token("--surface"),
          sunken: token("--surface-sunken"),
          raised: token("--surface-raised"),
          inverse: token("--surface-inverse"),
        },
        fg: {
          DEFAULT: token("--fg"),
          muted: token("--fg-muted"),
          subtle: token("--fg-subtle"),
          inverse: token("--fg-inverse"),
        },
        line: {
          DEFAULT: token("--line"),
          strong: token("--line-strong"),
        },
        // Accent — theme-aware on purpose: one brand hue, two tuned ramps.
        accent: {
          DEFAULT: token("--accent"),
          hover: token("--accent-hover"),
          soft: token("--accent-soft"),
          fg: token("--accent-fg"),
          ring: token("--accent-ring"),
        },

        // Back-compat aliases kept so existing call sites stay valid.
        paper: token("--canvas"),
        ink: token("--fg"),
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
        // Layered, low-alpha shadows read as depth rather than as a grey halo.
        xs: "0 1px 2px -1px rgb(20 28 26 / 0.10)",
        card: "0 1px 2px -1px rgb(20 28 26 / 0.07), 0 1px 1px -1px rgb(20 28 26 / 0.04)",
        "card-hover":
          "0 2px 4px -2px rgb(20 28 26 / 0.08), 0 8px 20px -8px rgb(20 28 26 / 0.14)",
        popover:
          "0 1px 2px -1px rgb(20 28 26 / 0.08), 0 12px 28px -10px rgb(20 28 26 / 0.22)",
        overlay:
          "0 1px 2px -1px rgb(20 28 26 / 0.10), 0 32px 64px -24px rgb(20 28 26 / 0.38)",
        focus: "0 0 0 1px rgb(var(--accent-ring) / 1)",
        // Dark mode needs light-on-dark lift rather than black drop shadows.
        "card-dark":
          "0 1px 2px -1px rgb(0 0 0 / 0.5), 0 8px 24px -12px rgb(0 0 0 / 0.6)",
      },
      borderRadius: {
        // System scale: prefer rounded-lg (0.5rem) for controls,
        // rounded-xl (0.75rem) for inputs, rounded-2xl (1rem) for cards.
        // xl2/xl3 kept for backwards-compat only — do not use in new code.
        xl2: "1rem",
        xl3: "1.25rem",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
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
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        // Staggered entrance used across cards/rows. `--enter-delay` is set inline
        // per item so lists cascade instead of popping in as one block.
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Attention pulse for live/"updated" indicators. Scales the ring only, so
        // it never reflows the badge it sits in.
        ping: {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.06)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
        caret: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.5s ease-in-out infinite",
        fadeIn: "fadeIn 0.5s ease-out",
        slideUp: "slideUp 0.5s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
        shimmer: "shimmer 1.8s linear infinite",
        rise: "rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        ping: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        drift: "drift 18s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        spinSlow: "spinSlow 18s linear infinite",
        caret: "caret 1.1s step-end infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
