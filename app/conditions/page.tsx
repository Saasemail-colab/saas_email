import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation | EmailOps",
  description: "Conditions d'utilisation de la plateforme EmailOps."
};

export default function TermsPage() {
  return (
    <main className="legalShell">
      <section className="legalHero">
        <a className="legalBack" href="/">EmailOps</a>
        <p className="eyebrow">Conditions</p>
        <h1>Conditions d&apos;utilisation</h1>
        <p>Ces conditions encadrent l&apos;utilisation de la plateforme EmailOps pour l&apos;envoi d&apos;emails via Resend et Gmail.</p>
      </section>
      <section className="legalPanel">
        <h2>Objet du service</h2>
        <p>EmailOps permet aux administrateurs autorises d&apos;enregistrer des expediteurs verifies, de connecter des fournisseurs email et d&apos;envoyer des messages transactionnels ou marketing conformes.</p>
        <h2>Compte admin</h2>
        <p>L&apos;acces a la console est reserve aux personnes disposant du code admin. L&apos;administrateur est responsable de la confidentialite des secrets, cles API et comptes connectes.</p>
        <h2>Expediteurs verifies</h2>
        <p>Vous ne devez envoyer des emails qu&apos;a partir d&apos;adresses ou domaines que vous controlez ou que vous etes autorise a utiliser. L&apos;usurpation d&apos;identite est interdite.</p>
        <h2>Respect des lois</h2>
        <p>Vous devez respecter les lois applicables aux emails, au consentement, au desabonnement, a la protection des donnees et a la lutte contre le spam.</p>
        <h2>Suspension</h2>
        <p>Un usage abusif, trompeur, non autorise ou contraire aux politiques Google, Resend ou aux presentes conditions peut entrainer la suspension de l&apos;acces.</p>
        <h2>Liens utiles</h2>
        <p><a href="/confidentialite">Politique de confidentialite</a> · <a href="/utilisation">Politique d&apos;utilisation acceptable</a> · <a href="/suppression-donnees">Suppression des donnees</a></p>
        <p className="legalUpdated">Derniere mise a jour : 9 mai 2026</p>
      </section>
    </main>
  );
}
