/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#15803d", light: "#22c55e", dark: "#14532d" },
      },
    },
  },
  plugins: [],
};
