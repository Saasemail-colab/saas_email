import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "EmailOps",
  description: "SaaS de gestion d'envoi et reception email avec Supabase."
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

