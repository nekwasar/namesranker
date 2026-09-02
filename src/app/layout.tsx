import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Serif } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://namesranker.com"),
  title: {
    default: "NamesRanker — Your name, ranked for you",
    template: "%s",
  },
  description:
    "Searchable, SEO-engineered pages that rank your name first on Google. Claim your name before someone else does.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable}`}>
        {children}
      </body>
    </html>
  );
}
