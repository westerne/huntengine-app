import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import AppNav from "./components/AppNav";
import ThemeScript from "./ui/ThemeScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Design system fonts (app/styles/hq.css): Inter for words, Roboto Mono for numbers.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const robotoMono = Roboto_Mono({ variable: "--font-hqmono", subsets: ["latin"], weight: ["400", "500", "600"] });

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
    <html lang="en" suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${robotoMono.variable} antialiased`}
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
