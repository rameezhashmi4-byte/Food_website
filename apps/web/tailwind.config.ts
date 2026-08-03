import type { Config } from "tailwindcss";

// BiteJoy design tokens, wired to the CSS custom properties defined in
// src/app/globals.css. Colors resolve through those variables so light/dark
// mode (driven purely by prefers-color-scheme, same as the ChatGPT widget)
// works automatically with no class-based theme toggle required.
const config: Config = {
  darkMode: "media",
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bj-bg)",
        surface: "var(--bj-surface)",
        border: {
          DEFAULT: "var(--bj-border)",
          strong: "var(--bj-border-strong)",
        },
        text: {
          DEFAULT: "var(--bj-text)",
          muted: "var(--bj-text-muted)",
        },
        // Top-level alias: every component in this kit uses the class
        // `text-muted` (not `text-text-muted`, which is what the nested
        // `text.muted` key above would actually generate) - this makes
        // that class resolve to the same CSS variable.
        muted: "var(--bj-text-muted)",
        accent: {
          DEFAULT: "var(--bj-accent)",
          strong: "var(--bj-accent-strong)",
          soft: "var(--bj-accent-soft)",
        },
        secondary: {
          DEFAULT: "var(--bj-secondary)",
          strong: "var(--bj-secondary-strong)",
          soft: "var(--bj-secondary-soft)",
        },
        success: {
          DEFAULT: "var(--bj-success)",
          strong: "var(--bj-success-strong)",
          soft: "var(--bj-success-soft)",
        },
        warn: {
          DEFAULT: "var(--bj-warn)",
          strong: "var(--bj-warn-strong)",
          soft: "var(--bj-warn-soft)",
        },
        danger: {
          DEFAULT: "var(--bj-danger)",
          strong: "var(--bj-danger-strong)",
          soft: "var(--bj-danger-soft)",
        },
        "on-solid": "var(--bj-on-solid)",
      },
      borderRadius: {
        bj: "var(--bj-radius)",
        "bj-sm": "var(--bj-radius-sm)",
      },
      boxShadow: {
        bj: "var(--bj-shadow)",
        "bj-lg": "var(--bj-shadow-lg)",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        "bj-content": "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
