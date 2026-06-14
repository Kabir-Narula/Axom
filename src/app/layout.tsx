import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Axom — from confused to confident",
  description:
    "Axom is a learning platform that reverse-engineers your exam from your own materials, diagnoses why you get things wrong, and rebuilds your understanding with spaced repetition and adaptive practice.",
  applicationName: "Axom",
  authors: [{ name: "Axom" }],
  keywords: [
    "study",
    "spaced repetition",
    "exam prep",
    "active recall",
    "learning",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="grain" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
