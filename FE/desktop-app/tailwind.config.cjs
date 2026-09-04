/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#101411", lime: "#d5ed8f" },
      fontFamily: { display: ["Playfair Display", "serif"], sans: ["Manrope", "sans-serif"] },
    },
  },
  plugins: [],
};
