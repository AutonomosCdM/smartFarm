import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github-dark.css";
import { Toaster } from "sonner";
import { ArtifactDisplay } from "@/components/artifact-display";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "smartFARM v3 - AI Agricultural Assistant",
  description: "AI-powered agricultural assistant with RAG, Artifacts, and agent orchestration for irrigation, pest control, weather, and crop management.",
  keywords: ["agriculture", "AI", "farming", "irrigation", "pest control", "crop management"],
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
        {children}
        <ArtifactDisplay />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
