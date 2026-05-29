import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { PwaRegister } from "@/components/PwaRegister";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0A3A22",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Ghadir Waqf",
  description: "The first permanent Islamic digital Waqf. Earn GHDR by sending Salawat. Donate as hadiya.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ghadir Waqf",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {/* Arabic calligraphy font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* PWA: iOS home screen */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ghadir Waqf" />
        {/* iOS splash screens */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* MS tiles */}
        <meta name="msapplication-TileImage" content="/icon-144.png" />
        <meta name="msapplication-TileColor" content="#0A3A22" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
            {children}
          </main>
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
