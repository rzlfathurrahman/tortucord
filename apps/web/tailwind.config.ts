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
      screens: {
        xs: "480px",
        "3xl": "1920px",
        "4xl": "2560px",
      },
      colors: {
        background: "#08090d",
        foreground: "#f4f4f5",
        surface: {
          50: "#181c2b",
          100: "#131722",
          200: "#0e111a",
          300: "#08090d",
        },
        card: {
          DEFAULT: "var(--card-bg, #0e111a)",
          foreground: "var(--foreground, #f4f4f5)",
          subtle: "var(--card-subtle, #121622)",
          hover: "var(--card-hover, #171c2a)",
        },
        border: "var(--border, rgba(255, 255, 255, 0.06))",
        borderHover: "var(--border-hover, rgba(255, 255, 255, 0.12))",
        discord: {
          blurple: "#5865F2",
          hover: "#4752C4",
          green: "#57F287",
          yellow: "#FEE75C",
          fuchsia: "#EB459E",
          red: "#ED4245",
          dark: "#2c2f33",
          darker: "#23272a",
          chatbg: "#313338",
          channel: "#80848E",
          hoverbg: "#35373c",
        },
        turtle: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        accent: {
          gold: "#f59e0b",
          amber: "#d97706",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
