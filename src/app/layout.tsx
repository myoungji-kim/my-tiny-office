import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "My Tiny Office",
  description: "A cozy simulation of your own tiny software company.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
