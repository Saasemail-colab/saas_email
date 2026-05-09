import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage des donnees Google | EmailOps",
  description: "Disclosure Google API Services et Limited Use pour EmailOps."
};

export default function GoogleApiDisclosurePage() {
  return (
    <main className="legalShell">
      <section className="legalHero">
        <a className="legalBack" href="/">EmailOps</a>
        <p className="eyebrow">Google API Services</p>
        <h1>Usage des donnees Google</h1>
        <p>EmailOps utilise les API Google uniquement pour connecter Gmail et envoyer les emails demandes par l'utilisateur autorise.</p>
      </section>
      <section className="legalPanel">
        <h2>Scopes demandes</h2>
        <p>EmailOps demande les scopes OpenID email/profile pour identifier le compte connecte et le scope Gmail Send pour envoyer des messages depuis ce compte.</p>
        <h2>Utilisation limitee</h2>
        <p>L'utilisation et le transfert des informations recues depuis les API Google respectent la Google API Services User Data Policy, y compris les exigences Limited Use.</p>
        <h2>Aucune vente ni publicite</h2>
        <p>EmailOps ne vend pas les donnees Google, ne les utilise pas pour de la publicite, du retargeting, du scoring credit ou de la surveillance.</p>
        <h2>Acces humain limite</h2>
        <p>Les humains ne lisent pas les donnees Google sauf accord explicite de l'utilisateur, besoin de securite, obligation legale ou operations internes autorisees sur donnees agregees.</p>
        <h2>Stockage</h2>
        <p>Les tokens Gmail sont stockes chiffres. Les secrets doivent rester dans les variables d'environnement serveur et ne doivent pas etre publies.</p>
        <h2>Retrait d'acces</h2>
        <p>Vous pouvez retirer l'acces a tout moment depuis votre compte Google ou demander la suppression via la page <a href="/suppression-donnees">Suppression des donnees</a>.</p>
        <p className="legalUpdated">Derniere mise a jour : 9 mai 2026</p>
      </section>
    </main>
  );
}
