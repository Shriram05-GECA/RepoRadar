import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoRadar — GitHub Security Scanner & Interactive Threat Map",
  description:
    "Turn your GitHub repository into a living security map. Detect secrets, vulnerable dependencies, and misconfigurations in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Unbounded:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0B0B14] text-[#EDEDF0] antialiased selection:bg-radar-lime selection:text-black">
        {children}
      </body>
    </html>
  );
}
