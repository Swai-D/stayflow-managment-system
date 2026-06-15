import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import ClientProviders from '@/components/shared/ClientProviders'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Buffalo Hotel — Reservation Management System",
    template: "%s | Buffalo Hotel"
  },
  description: "The official reservation and management platform for Buffalo Hotel. Book rooms, manage expenses, and track hotel performance with ease.",
  keywords: ["Buffalo Hotel", "Morogoro", "Hotel Management", "Reservation System", "StayFlow", "Tanzania Hotels"],
  authors: [{ name: "Buffalo Hotel" }],
  creator: "StayFlow RMS",
  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: "https://buffalo-hotel-managment-system.up.railway.app",
    siteName: "Buffalo Hotel RMS",
    title: "Buffalo Hotel — Reservation & Management System",
    description: "Welcome to Buffalo Hotel's official digital platform. Modern hospitality management simplified.",
    images: [
      {
        url: "/globe.svg", // Using an existing asset as a placeholder
        width: 1200,
        height: 630,
        alt: "Buffalo Hotel Branding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buffalo Hotel — Reservation System",
    description: "Modern hospitality management for Buffalo Hotel.",
    images: ["/globe.svg"],
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sw"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ClientProviders>
          {children}
          <Toaster 
            position="top-center" 
            richColors 
            closeButton 
            toastOptions={{
              style: {
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #f3f4f6',
                boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
              },
            }}
          />
        </ClientProviders>
      </body>
    </html>
  )
}
