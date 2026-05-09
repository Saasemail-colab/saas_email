import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialite | EmailOps",
  description: "Politique de confidentialite de la plateforme EmailOps."
};

export default function PrivacyPage() {
  return (
    <main className="legalShell">
      <section className="legalHero">
        <a className="legalBack" href="/">
          EmailOps
        </a>
        <p className="eyebrow">Confidentialite</p>
        <h1>Politique de confidentialite</h1>
        <p>
          Cette page explique comment EmailOps traite les donnees utilisees pour connecter des comptes email,
          envoyer des messages et administrer la plateforme.
        </p>
      </section>

      <section className="legalPanel">
        <h2>Donnees collectees</h2>
        <p>
          EmailOps peut traiter les informations d&apos;organisation, les adresses expediteur, les destinataires, le
          contenu des emails, les journaux d&apos;envoi, les statuts de livraison et les informations techniques liees aux
          fournisseurs email connectes.
        </p>

        <h2>Connexion Google et Gmail</h2>
        <p>
          Lorsque vous connectez un compte Gmail, EmailOps demande uniquement les autorisations necessaires pour envoyer
          des emails depuis le compte selectionne. Les tokens Google sont stockes de maniere chiffree et servent a
          envoyer les messages demandes par l&apos;administrateur.
        </p>

        <h2>Utilisation des donnees</h2>
        <p>
          Les donnees sont utilisees pour enregistrer les expediteurs, envoyer les emails, suivre les statuts
          techniques, appliquer les listes de suppression et securiser l&apos;acces admin. EmailOps ne vend pas les donnees
          personnelles.
        </p>

        <h2>Partage avec les fournisseurs</h2>
        <p>
          Pour executer l&apos;envoi, certaines donnees peuvent etre transmises aux fournisseurs configures, principalement
          Gmail et Resend. Ces fournisseurs traitent les messages selon leurs propres conditions et politiques.
        </p>

        <h2>Securite</h2>
        <p>
          L&apos;espace admin est protege par un code d&apos;acces. Les secrets sensibles doivent etre conserves uniquement dans
          les variables d&apos;environnement du serveur, comme Render ou Railway, et ne doivent pas etre publies dans GitHub.
        </p>

        <h2>Conservation et suppression</h2>
        <p>
          Les donnees techniques peuvent etre conservees tant qu&apos;elles sont necessaires a l&apos;exploitation du service. Un
          administrateur peut supprimer ou deconnecter un expediteur depuis la base de donnees ou les outils
          d&apos;administration prevus.
        </p>

        <h2>Contact</h2>
        <p>
          Pour toute demande concernant cette politique ou les donnees traitees par EmailOps, contactez l&apos;administrateur
          de la plateforme.
        </p>

        <p className="legalUpdated">Derniere mise a jour : 8 mai 2026</p>
      </section>
    </main>
  );
}
