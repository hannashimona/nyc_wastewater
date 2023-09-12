/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FF7A41",
        secondary: "#FFECE3",
        tertiary: "#480000",
      },
    },
  },
  plugins: [],
}
