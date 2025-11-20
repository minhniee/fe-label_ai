import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { QueryProvider } from "@/components/query-provider";

import { SonnerToaster } from "@/components/ui/sonner-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPTU Lable-AI",
  description:
    "Internal platform for managing data, labeling, AI training, and tracking admissions progress at FPT University",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable}`}
      >
        <QueryProvider>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
          <SonnerToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
