# SaaS de gestion email

Ce projet vise a creer une plateforme SaaS pour envoyer, recevoir et suivre des emails de facon professionnelle.

Le systeme doit permettre:

- l'envoi d'emails transactionnels et marketing;
- la reception d'emails entrants via providers ou webhooks;
- la gestion de plusieurs expediteurs autorises;
- la gestion des destinataires, listes, suppressions et consentements;
- le suivi des envois, ouvertures, clics, bounces et plaintes;
- l'automatisation via API, webhooks, templates et files d'attente;
- l'administration multi-tenant avec roles, permissions et audit.

## Regle importante

Le produit ne doit pas usurper n'importe quelle adresse email. Les expediteurs doivent etre verifies par domaine, DNS ou provider afin de respecter SPF, DKIM, DMARC et les lois anti-spam.

On peut changer l'expediteur parmi des identites autorisees:

- `support@domaine-client.com`
- `facturation@domaine-client.com`
- `newsletter@domaine-client.com`
- alias verifies par l'organisation

On ne doit pas permettre l'envoi depuis une adresse non controlee par l'utilisateur.

## Documents de depart

- [Installation de zero](INSTALLATION_ZERO.md)
- [Specification produit](docs/PRODUCT_SPEC.md)
- [Architecture technique](docs/ARCHITECTURE.md)
- [Securite et conformite](docs/SECURITY_COMPLIANCE.md)
- [Schema de donnees initial](docs/DATA_MODEL.sql)
- [Deploiement Railway / Render / Supabase](docs/DEPLOYMENT.md)
- [Configuration anti-spam et delivrabilite](docs/DELIVERABILITY.md)
- [Support multi-provider email](docs/MULTI_PROVIDER.md)

## Stack de depart

- App: Next.js + TypeScript
- Base de donnees: Supabase PostgreSQL
- Envoi email MVP: Resend, Gmail SMTP, Gmail OAuth
- Deploiement: Railway ou Render

## Lancer en local

```bash
npm install
cp .env.example .env
npm run dev
```

Avant d'utiliser l'API d'envoi, configurer Supabase, lancer le diagnostic admin, installer la base Supabase, puis ajouter un expediteur verifie.

## MVP recommande

1. Authentification et organisations multi-tenant.
2. Verification de domaines et expediteurs.
3. Connexion a un provider email externe.
4. Envoi d'emails via API et interface web.
5. Boite de reception entrante basique.
6. Journaux d'evenements: envoye, livre, bounce, plainte.
7. Suppression list et desabonnement.
8. Tableau de bord de delivrabilite.
