/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B14",
        foreground: "#EDEDF0",
        radar: {
          bg: "#0B0B14",
          surface: "#111122",
          elevated: "#181830",
          border: "#252545",
          borderBright: "#383868",
          lime: "#C6FF3D",
          magenta: "#FF2E93",
          blue: "#3D5AFE",
          cyan: "#00E5FF",
          orange: "#FF9100",
          critical: "#FF2B44",
          high: "#FF2E93",
          medium: "#FF9100",
          low: "#00E5FF",
          info: "#3D5AFE",
          healthy: "#141426",
          textMuted: "#8888AA",
          textSubtle: "#5A5A7A",
        },
      },
      fontFamily: {
        sans: ["var(--font-instrument)", "system-ui", "sans-serif"],
        display: ["var(--font-unbounded)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "radar-sweep": "radarSweep 4s linear infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
