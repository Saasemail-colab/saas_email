import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "EmailOps",
  description: "Plateforme SaaS pour envoyer des emails depuis des expediteurs verifies."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
