/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,scss,css}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          coral: "#f95738",
          orange: "#fbbf24",
          slate: "#1a1d2e",
          navy: "#151827",
          dark: "#0f121d",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        squircle: "14px",
      },
    },
  },
  plugins: [],
};
