import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { preferencesScript } from "@/lib/preferences";
import { Providers } from "./providers";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the browser, no layout shift.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Doctor Tracker", template: "%s · Doctor Tracker" },
  description: "Manage doctors, the patients assigned to them, and clinic analytics.",
  // Private admin portal: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // en-BD: English as used in Bangladesh. suppressHydrationWarning: the preferences script sets
    // data-theme / data-sidebar on <html> before React hydrates.
    <html lang="en-BD" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme and sidebar state before the first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
