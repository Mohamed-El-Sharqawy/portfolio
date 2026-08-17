import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar.client";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Frontend engineer building national-scale systems — and the AI agent teams that help ship them. 3+ years of production frontend across enterprise platforms, e-commerce, and ERP.";

export const metadata: Metadata = {
  metadataBase: new URL("https://portfolio-mohamed.vercel.app"),
  title: "Mohamed Ahmed — Frontend Engineer & AI Agentic Systems",
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Mohamed Ahmed — Portfolio",
    title: "Mohamed Ahmed — Frontend Engineer & AI Agentic Systems",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
