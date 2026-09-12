import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clai — Talk to Your Agreements",
  description: "Talk to your agreements. Understand what matters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}