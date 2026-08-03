import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

// Self-hosted via next/font (no external font CDN request at runtime).
// Plus Jakarta Sans: a warm, rounded-but-modern geometric sans that reads
// as friendly without being twee. Falls back to the widget's own system-font
// stack (see globals.css) so text never visibly reflows before it loads.
const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BiteJoy — your joyful AI food companion",
    template: "%s · BiteJoy",
  },
  description:
    "BiteJoy is your joyful AI food companion. Tell it your location, budget, mood and cravings, and it will help you find somewhere worth getting excited about.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontSans.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-text antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
