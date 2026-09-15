import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--kor-bg)",
        surface: "var(--kor-surface)",
        "surface-2": "var(--kor-surface-2)",
        border: "var(--kor-border)",
        text: "var(--kor-text)",
        "text-muted": "var(--kor-text-muted)",
        accent: "var(--kor-accent)",
        "accent-2": "var(--kor-accent-2)",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--kor-radius-sm)",
        md: "var(--kor-radius-md)",
        lg: "var(--kor-radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
