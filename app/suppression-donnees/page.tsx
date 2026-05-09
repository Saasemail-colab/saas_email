import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suppression des donnees | EmailOps",
  description: "Procedure de suppression des donnees et de deconnexion Gmail dans EmailOps."
};

export default function DataDeletionPage() {
  return (
    <main className="legalShell">
      <section className="legalHero">
        <a className="legalBack" href="/">EmailOps</a>
        <p className="eyebrow">Donnees</p>
        <h1>Suppression des donnees</h1>
        <p>Cette page explique comment demander la suppression des donnees et retirer l'acces Gmail.</p>
      </section>
      <section className="legalPanel">
        <h2>Deconnecter Gmail</h2>
        <p>Vous pouvez retirer l'acces de l'application depuis votre compte Google: Compte Google, Securite, Connexions avec des applications tierces, puis supprimer l'acces EmailOps.</p>
        <h2>Supprimer les donnees dans EmailOps</h2>
        <p>Un administrateur peut demander la suppression des comptes providers, expediteurs, journaux d'envoi, destinataires et organisations associes au service.</p>
        <h2>Delai de traitement</h2>
        <p>Les demandes de suppression sont traitees dans un delai raisonnable. Certaines donnees techniques peuvent etre conservees temporairement si elles sont necessaires a la securite, a la prevention des abus ou a une obligation legale.</p>
        <h2>Contact</h2>
        <p>Pour demander une suppression, contactez l'administrateur de la plateforme avec l'adresse email concernee et l'organisation associee.</p>
        <p className="legalUpdated">Derniere mise a jour : 9 mai 2026</p>
      </section>
    </main>
  );
}
