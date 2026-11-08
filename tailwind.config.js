/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        ink: "#080808",
        mute: "#777777",
        line: "#D0D0D0",
        haze: "#F7F7F7",
        // Accentkleuren: groen = voortgang / juist / geselecteerd (quiz, voortgangsmeters), rood = fout.
        ok: { DEFAULT: "#2F9E57", soft: "#E3F6E8", line: "#CDEBD6", ink: "#1E6B3A" },
        bad: { DEFAULT: "#D14343", soft: "#FDECEC", line: "#F3CACA", ink: "#A12C2C" },
      },
      fontFamily: {
        sans: ['Inter', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.055em", meta: "0.08em" },
      maxWidth: { page: "1240px" },
    },
  },
  plugins: [],
};
