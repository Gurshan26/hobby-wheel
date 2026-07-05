import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Self-Discovery Hobby Wheel",
  description: "Spin, try, log, and learn which activities fit you.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hobby Wheel",
  },
};

export const viewport: Viewport = {
  themeColor: "#EDEADF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunitoSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
