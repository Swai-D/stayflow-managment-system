'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      }
    }
  }))

  return (
    <html
      lang="sw"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </body>
    </html>
  )
}
