/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // TERRA design tokens (spec §5). Mapped to CSS variables so a single
        // source of truth in tokens.css drives Tailwind utilities too.
        "terra-bg": "var(--terra-bg)",
        "terra-surface-1": "var(--terra-surface-1)",
        "terra-surface-2": "var(--terra-surface-2)",
        "terra-surface-3": "var(--terra-surface-3)",
        "terra-text": "var(--terra-text)",
        "terra-text-secondary": "var(--terra-text-secondary)",
        "terra-text-muted": "var(--terra-text-muted)",
        "terra-border": "var(--terra-border)",
        "terra-border-hover": "var(--terra-border-hover)",
        "terra-accent": "var(--terra-accent)",
        "terra-cyan": "var(--terra-cyan)",
        "terra-violet": "var(--terra-violet)",
        "terra-green": "var(--terra-green)",
        "terra-amber": "var(--terra-amber)",
        "terra-red": "var(--terra-red)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontFeatureSettings: {
        tnum: '"tnum" 1',
      },
      boxShadow: {
        panel: "0 8px 30px rgba(0, 0, 0, 0.45)",
        "panel-lg": "0 16px 50px rgba(0, 0, 0, 0.55)",
      },
      transitionTimingFunction: {
        terra: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
