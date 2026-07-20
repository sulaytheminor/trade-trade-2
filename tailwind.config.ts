import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#000000",
        panel: "#0A0A0A",
        border: "#1F1F1F",
        white: "#FFFFFF",
        blue: {
          DEFAULT: "#2F6BFF",
          dim: "#1B3E99"
        },
        red: {
          DEFAULT: "#FF3B3B",
          dim: "#8C1F1F"
        },
        green: {
          DEFAULT: "#1FCB6B"
        },
        orange: {
          DEFAULT: "#FF9B2F"
        },
        muted: "#8A8A8A"
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        full: "0px"
      }
    }
  },
  plugins: []
};

export default config;
