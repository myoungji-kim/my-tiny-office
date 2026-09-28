import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { resolveLocale } from "../i18n";

import "./globals.css";
// The design system the sample pages define is the app's own, not a copy of it.
import "../../docs/ui/system.css";
import "./app.css";
import "./first-run.css";
import "./office.css";
import "./people.css";

// Fetched once at build and served by the app, never from a font CDN at run time.
const sans = Noto_Sans_KR({ weight: ["400", "500", "600", "700"], preload: false, display: "swap", variable: "--font-noto" });

export const metadata: Metadata = {
  title: "My Tiny Office",
  description: "Your own tiny software office, where AI employees do the work.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = resolveLocale((await headers()).get("accept-language"));
  return (
    <html lang={locale} className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
