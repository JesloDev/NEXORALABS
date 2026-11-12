import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
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
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon-32.png", type: "image/png", sizes: "32x32" }, { url: "/favicon-48.png", type: "image/png", sizes: "48x48" }],
    apple: "/apple-touch-icon.png",
  },
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
  themeColor: "#eae2cb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
