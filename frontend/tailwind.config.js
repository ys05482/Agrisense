/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a34a",
          light: "#22c55e",
          dark: "#15803d",
        },
        sky: {
          DEFAULT: "#0284c7",
        },
        soil: {
          DEFAULT: "#92400e",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Devanagari", "sans-serif"],
      },
    },
  },
  plugins: [],
};
