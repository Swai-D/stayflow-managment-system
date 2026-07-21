import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        // ─── Buffalo Hotel — StayFlow Template Colors ───
        primary: {
          DEFAULT: "#8B4530",
          hover: "#6E3323",
          light: "#F5DFCE",
          pale: "#FBF1EA",
          foreground: "#FFFFFF",
        },
        page: "#F0F2F5",
        surface: "#FFFFFF",
        subtle:  "#F3F4F6",
        // Status colors — template exact
        status: {
          checkedin:      "#8B4530",
          "checkedin-bg": "#FBF1EA",
          arriving:       "#26120C",
          "arriving-bg":  "#26120C",
          pending:        "#854D0E",
          "pending-bg":   "#FEF9C3",
          lateco:         "#DC2626",
          "lateco-bg":    "#FEE2E2",
          cancelled:      "#6B7280",
          "cancelled-bg": "#F9FAFB",
          confirmed:      "#8B4530",
          "confirmed-bg": "#FBF1EA",
          "arriving-green":    "#166534",
          "arriving-green-bg": "#DCFCE7",
        },
        // Room grid status colors — template exact
        room: {
          available:   "#F3F4F6",
          "available-blue": "#FBF1EA",
          occupied:    "#EBC3A6",
          "occupied-mid": "#8B4530",
          "occupied-dark": "#26120C",
          dirty:       "#FEF3C7",
          cleaning:    "#E0E7FF",
          maintenance: "#FEE2E2",
          blocked:     "#F3F4F6",
        },
      },
      borderRadius: {
        lg:   "12px",
        md:   "8px",
        sm:   "6px",
        xl:   "16px",
        "2xl":"20px",
      },
      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)",
        "card-hover": "0 8px 20px rgba(0,0,0,0.08), 0 4px 12px rgba(139,69,48,0.08)",
        md:     "0 4px 16px rgba(0,0,0,0.08)",
        modal:  "0 20px 60px rgba(0,0,0,0.15)",
      },
      width: {
        sidebar: "240px",
      },
      transitionDuration: {
        "150": "150ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
