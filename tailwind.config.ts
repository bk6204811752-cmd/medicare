import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        med: {
          green: "#00A878",
          greenDark: "#007A57",
          greenSoft: "#E6F7F2",
          orange: "#FF6B35",
          navy: "#0D1B2A",
          ink: "#14213D",
          mist: "#F7FAFC"
        }
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(13, 27, 42, 0.08)",
        card: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "glow-green":
          "0 0 0 3px rgba(0, 168, 120, 0.15), 0 0 12px rgba(0, 168, 120, 0.08)"
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "button-press": "buttonPress 0.2s ease-out",
        glow: "glow 2s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        buttonPress: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" }
        },
        glow: {
          "0%": {
            boxShadow:
              "0 0 0 3px rgba(0, 168, 120, 0.15), 0 0 12px rgba(0, 168, 120, 0.08)"
          },
          "50%": {
            boxShadow:
              "0 0 0 3px rgba(0, 168, 120, 0.25), 0 0 20px rgba(0, 168, 120, 0.15)"
          },
          "100%": {
            boxShadow:
              "0 0 0 3px rgba(0, 168, 120, 0.15), 0 0 12px rgba(0, 168, 120, 0.08)"
          }
        }
      }
    }
  },
  plugins: []
};

export default config;
