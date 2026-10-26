/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        plum: {
          50: "#fbf6fb",
          100: "#f6edf5",
          200: "#eddceb",
          300: "#dfc1dc",
          400: "#cc9ec8",
          500: "#b57ab0",
          600: "#995e94",
          700: "#7c4978",
          800: "#583b58",
          900: "#4a324a",
          950: "#301e30",
        },
        blush: {
          50: "#fdf8fa",
          100: "#faf5f7",
          200: "#f5e6ed",
          300: "#eed2df",
          400: "#e4b4cb",
          500: "#d985b7",
          600: "#c767a1",
          700: "#ad4d86",
          800: "#8e406e",
          900: "#74385b",
        },
        phase: {
          menstruation: "#E05A8D",
          follicular: "#F69988",
          ovulation: "#D884B6",
          luteal: "#9D72BE",
        },
        softsurface: "#FFFFFF",
        softbg: "#FAF5F7",
        softborder: "#EFE4EC",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -10px rgba(180, 140, 170, 0.12)",
        card: "0 8px 24px -6px rgba(140, 100, 130, 0.08)",
        glow: "0 0 40px rgba(224, 90, 141, 0.15)",
        plum: "0 8px 20px -4px rgba(80, 55, 80, 0.3)",
      }
    },
  },
  plugins: [],
}
