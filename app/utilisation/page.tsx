import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique d'utilisation acceptable | EmailOps",
  description: "Regles d'utilisation acceptable pour EmailOps."
};

export default function AcceptableUsePage() {
  return (
    <main className="legalShell">
      <section className="legalHero">
        <a className="legalBack" href="/">EmailOps</a>
        <p className="eyebrow">Utilisation acceptable</p>
        <h1>Politique d&apos;utilisation acceptable</h1>
        <p>Cette politique definit les usages autorises et interdits de la plateforme EmailOps.</p>
      </section>
      <section className="legalPanel">
        <h2>Usages autorises</h2>
        <p>EmailOps peut etre utilise pour envoyer des emails transactionnels, des notifications, des reponses support et des campagnes marketing avec consentement valide.</p>
        <h2>Usages interdits</h2>
        <p>Il est interdit d&apos;utiliser EmailOps pour le spam, le phishing, l&apos;usurpation d&apos;identite, la fraude, les contenus malveillants, la collecte abusive de donnees ou l&apos;envoi a des destinataires sans base legale.</p>
        <h2>Gmail et donnees Google</h2>
        <p>Les comptes Gmail connectes doivent appartenir a l&apos;utilisateur ou etre utilises avec autorisation. EmailOps utilise Gmail uniquement pour envoyer les messages demandes dans l&apos;interface ou via l&apos;API.</p>
        <h2>Desabonnement et suppressions</h2>
        <p>Les emails marketing doivent respecter les demandes de desabonnement et les listes de suppression. Les destinataires supprimes ne doivent pas etre reintegres sans consentement.</p>
        <h2>Sanctions</h2>
        <p>Tout usage abusif peut entrainer la desactivation d&apos;un expediteur, d&apos;une organisation ou d&apos;un provider connecte.</p>
        <p className="legalUpdated">Derniere mise a jour : 9 mai 2026</p>
      </section>
    </main>
  );
}
