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
        canvas: "#FFE500",
        brutal: {
          yellow: "#FFE500",
          pink: "#FF5376",
          mint: "#22C55E",
          cyan: "#00E5FF",
          purple: "#D4B2FF",
          dark: "#1B1B1B",
          card: "#FFFFFF",
          muted: "#F5F5F5",
        },
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #000000",
        "brutal-sm": "2px 2px 0px 0px #000000",
        "brutal-lg": "6px 6px 0px 0px #000000",
        "brutal-pressed": "0px 0px 0px 0px #000000",
      },
      borderWidth: {
        3: "3px",
      },
      fontFamily: {
        grotesk: ["'Space Grotesk'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
