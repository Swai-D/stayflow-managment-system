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
        // ─── StayFlow — YowStay Design System ───
        primary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          light: "#EFF6FF",
          muted: "#DBEAFE",
          foreground: "#FFFFFF",
        },
        page: "#F0F2F5",
        surface: "#FFFFFF",
        subtle:  "#F3F4F6",
        // Booking status — light bg + colored text
        status: {
          checkedin:      "#10B981",
          "checkedin-bg": "#ECFDF5",
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
        // Room grid status colors
        room: {
          available:   "#EFF6FF",
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
        md:     "0 4px 16px rgba(0,0,0,0.08)",
        modal:  "0 20px 60px rgba(0,0,0,0.15)",
      },
      width: {
        sidebar: "240px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
