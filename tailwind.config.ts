import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.mdx",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand-primary) / <alpha-value>)",
          hover: "hsl(var(--brand-hover) / <alpha-value>)",
          violet: "hsl(var(--brand-violet) / <alpha-value>)",
          cyan: "hsl(var(--brand-cyan) / <alpha-value>)",
          gold: "hsl(var(--brand-gold) / <alpha-value>)",
          soft: "hsl(var(--brand-soft) / <alpha-value>)",
          ink: "hsl(var(--brand-ink) / <alpha-value>)",
        },
        background: {
          DEFAULT: "hsl(var(--background) / <alpha-value>)",
          subtle: "hsl(var(--background-subtle) / <alpha-value>)",
          muted: "hsl(var(--background-muted) / <alpha-value>)",
          hover: "hsl(var(--background-hover) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          raised: "hsl(var(--surface-raised) / <alpha-value>)",
          muted: "hsl(var(--surface-muted) / <alpha-value>)",
          hover: "hsl(var(--surface-hover) / <alpha-value>)",
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground) / <alpha-value>)",
          secondary: "hsl(var(--foreground-secondary) / <alpha-value>)",
          tertiary: "hsl(var(--foreground-tertiary) / <alpha-value>)",
          muted: "hsl(var(--foreground-muted) / <alpha-value>)",
          disabled: "hsl(var(--foreground-disabled) / <alpha-value>)",
          inverted: "hsl(var(--foreground-inverted) / <alpha-value>)",
        },
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          subtle: "hsl(var(--border-subtle) / <alpha-value>)",
          strong: "hsl(var(--border-strong) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          light: "hsl(var(--success-light) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          light: "hsl(var(--warning-light) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          light: "hsl(var(--destructive-light) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          light: "hsl(var(--info-light) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      maxWidth: {
        content: "1200px",
      },
      width: {
        sidebar: "224px",
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "20px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        brand: "var(--shadow-brand)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
