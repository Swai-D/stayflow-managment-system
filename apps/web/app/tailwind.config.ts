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
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          light: "#DBEAFE",
          pale: "#EFF6FF",
          foreground: "#FFFFFF",
        },
        page: "#F0F2F5",
        surface: "#FFFFFF",
        subtle:  "#F3F4F6",
        // Status colors — template exact
        status: {
          checkedin:      "#2563EB",
          "checkedin-bg": "#EFF6FF",
          arriving:       "#1A2B4A",
          "arriving-bg":  "#1A2B4A",
          pending:        "#854D0E",
          "pending-bg":   "#FEF9C3",
          lateco:         "#DC2626",
          "lateco-bg":    "#FEE2E2",
          cancelled:      "#6B7280",
          "cancelled-bg": "#F9FAFB",
          confirmed:      "#2563EB",
          "confirmed-bg": "#EFF6FF",
          "arriving-green":    "#166534",
          "arriving-green-bg": "#DCFCE7",
        },
        // Room grid status colors — template exact
        room: {
          available:   "#F3F4F6",
          "available-blue": "#EFF6FF",
          occupied:    "#BFDBFE",
          "occupied-mid": "#2563EB",
          "occupied-dark": "#1A2B4A",
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
        "card-hover": "0 8px 20px rgba(0,0,0,0.08), 0 4px 12px rgba(37,99,235,0.08)",
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
