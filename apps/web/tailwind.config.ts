import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--gossip-bg)",
        surface: "var(--gossip-surface)",
        "surface-2": "var(--gossip-surface-2)",
        border: "var(--gossip-border)",
        text: "var(--gossip-text)",
        "text-muted": "var(--gossip-text-muted)",
        accent: "var(--gossip-accent)",
        "accent-soft": "var(--gossip-accent-soft)",
        error: "var(--gossip-error)",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--gossip-radius-sm)",
        md: "var(--gossip-radius-md)",
        lg: "var(--gossip-radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
