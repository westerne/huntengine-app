import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import AppNav from "./components/AppNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// HuntQuarters GA4 property. Loads on the production deploy only, so local and
// preview testing don't count as visits; NEXT_PUBLIC_GA_ID overrides it.
const GA_ID =
  process.env.NEXT_PUBLIC_GA_ID ?? (process.env.VERCEL_ENV === 'production' ? 'G-19RVQZEPFC' : undefined);

export const metadata: Metadata = {
  title: "HuntQuarters | Western Big Game Hunt Planner",
  description:
    "Plan your western big game hunts with real draw odds, unit maps and public land data. Find units you can draw and get a full plan for your hunt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppNav />
        {children}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
