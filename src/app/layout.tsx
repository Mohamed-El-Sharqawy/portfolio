import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar.client";
import Footer from "@/components/layout/Footer";
import ScrollProgress from "@/components/layout/ScrollProgress.client";
import SmoothScroll from "@/components/layout/SmoothScroll.client";
import SceneDirector from "@/components/three/SceneDirector.client";
import { profile } from "@/content/profile";
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

const title = "Mohamed Ahmed — Frontend Engineer & AI Agentic Systems";

export const metadata: Metadata = {
  metadataBase: new URL("https://portfolio.winningkart.tech"),
  title: {
    default: title,
    template: "%s — Mohamed Ahmed",
  },
  description,
  keywords: [
    "frontend engineer",
    "react",
    "next.js",
    "typescript",
    "cairo",
    "remote",
    "AI agents",
  ],
  authors: [{ name: profile.name }],
  creator: profile.name,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Mohamed Ahmed",
    locale: "en_US",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: "Frontend Engineer",
  email: `mailto:${profile.email}`,
  url: "https://portfolio.winningkart.tech",
  sameAs: [profile.linkedin, profile.github],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cairo",
    addressCountry: "EG",
  },
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "Node.js",
    "AI agent orchestration",
  ],
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "Open University UK" },
    { "@type": "CollegeOrUniversity", name: "Arab Open University" },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <Navbar />
        <SceneDirector />
        <SmoothScroll />
        <main>{children}</main>
        <Footer />
        <ScrollProgress />
      </body>
    </html>
  );
}
