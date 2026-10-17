import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Repo Tutor — Understand Any Codebase, Step by Step",
  description:
    "Turn any GitHub repository into a guided learning journey. Follow lessons, explore code, and test your knowledge.",
  keywords: ["github", "learning", "coding", "open source", "tutorial"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:border-2 focus:border-ink focus:bg-sun focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
        >
          Skip to main content
        </a>
        <Navbar />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
