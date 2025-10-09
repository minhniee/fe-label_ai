import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "FPTU Lable-AI",
  description:
    "Internal platform for managing data, labeling, AI training, and tracking admissions progress at FPT University",
  generator: "v0.app",
}

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-inter" })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <QueryProvider>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
