import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae2",
          300: "#b1bac8",
          400: "#8694a9",
          500: "#67768e",
          600: "#525f75",
          700: "#434d5f",
          800: "#3a4250",
          900: "#333a45",
          950: "#22262e"
        },
        accent: {
          50: "#effaf6",
          100: "#d8f3e7",
          200: "#b4e6d2",
          300: "#82d3b8",
          400: "#4eb999",
          500: "#2b9d7f",
          600: "#1e7e66",
          700: "#186553",
          800: "#165143",
          900: "#134338",
          950: "#0a2620"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)"
      }
    }
  },
  plugins: []
};
export default config;
