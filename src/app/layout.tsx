import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shrink Studio - Internal Tools",
  description: "Internal scoping and pricing tools for Shrink Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
