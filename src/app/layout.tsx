import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HKR.TEAM — Assessment Platform",
  description: "Create assessments, evaluate candidates, and manage hiring workflows.",
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
