import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXORALABS — Turning Ideas Into Sustainable Solutions",
  description:
    "NEXORALABS partners with the UN Sustainable Development Goals to transform bold ideas into sustainable, scalable solutions. Innovate, collaborate, and grow with us.",
  keywords: ["NEXORALABS", "SDG", "sustainability", "innovation", "sustainable solutions", "social impact"],
  authors: [{ name: "NEXORALABS" }],
  openGraph: {
    title: "NEXORALABS — Turning Ideas Into Sustainable Solutions",
    description: "We turn ideas into sustainable solutions in partnership with the SDGs.",
    siteName: "NEXORALABS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXORALABS",
    description: "Turning ideas into sustainable solutions.",
  },
};

export const viewport: Viewport = {
  themeColor: "#051014",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
