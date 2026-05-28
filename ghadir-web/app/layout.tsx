import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ghadir Waqf",
  description: "The first permanent Islamic digital Waqf on Celo blockchain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
