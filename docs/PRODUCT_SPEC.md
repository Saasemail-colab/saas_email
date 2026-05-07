# Specification produit

## Vision

Construire une plateforme SaaS qui centralise l'envoi, la reception et l'automatisation des emails pour plusieurs clients, domaines et cas d'usage.

Le produit doit etre fiable, conforme et simple a piloter: l'utilisateur choisit un domaine verifie, un expediteur autorise, des destinataires valides, un template, puis le systeme se charge de l'envoi, du suivi et des retours.

## Utilisateurs cibles

- Startups qui veulent gerer leurs emails transactionnels.
- Equipes support qui veulent recevoir et repondre aux messages.
- Equipes marketing qui veulent envoyer des campagnes conformes.
- Agences qui gerent plusieurs domaines clients.
- Developpeurs qui veulent une API email unifiee.

## Modules principaux

### Organisations

Chaque client utilise une organisation separee avec ses propres domaines, expediteurs, contacts, templates, quotas et logs.

Fonctions:

- creation d'organisation;
- invitation d'equipe;
- roles: owner, admin, developer, marketer, support, viewer;
- audit des actions sensibles.

### Domaines et expediteurs

Le systeme permet d'ajouter plusieurs domaines et expediteurs, mais chaque identite doit etre verifiee.

Fonctions:

- ajout d'un domaine;
- generation des entrees DNS SPF, DKIM, DMARC, MX et tracking;
- verification DNS;
- creation d'adresses expediteurs;
- alias autorises;
- statut: pending, verified, rejected, suspended.

### Envoi email

Fonctions:

- envoi simple depuis l'interface;
- envoi via API;
- templates avec variables;
- pieces jointes controlees;
- files d'attente;
- retries;
- priorites;
- choix du provider;
- rate limiting;
- journal complet par message.

### Reception email

Fonctions:

- reception via MX provider ou webhook;
- parsing du contenu;
- stockage des pieces jointes;
- association a une conversation;
- reponse depuis un expediteur autorise;
- etiquettes et statut: open, pending, resolved, archived.

### Contacts et destinataires

Fonctions:

- carnet de contacts;
- listes;
- segments;
- consentement;
- suppression list;
- import CSV;
- validation d'adresse;
- historique des interactions.

### Automatisations

Fonctions:

- trigger API;
- webhooks entrants;
- regles simples: si bounce, supprimer; si plainte, bloquer;
- sequences email conformes;
- notifications internes.

### Reporting

Indicateurs:

- emails envoyes;
- livraison;
- bounces;
- plaintes;
- ouvertures;
- clics;
- taux de desabonnement;
- reputation par domaine/provider;
- erreurs provider.

## Surfaces UI

### Dashboard

Vue synthetique de l'activite email:

- volume d'envoi;
- sante des domaines;
- erreurs recentes;
- files d'attente;
- bounces et plaintes;
- reputation.

### Email composer

Interface de composition:

- choix de l'organisation;
- choix de l'expediteur verifie;
- destinataires;
- sujet;
- template;
- variables;
- previsualisation;
- envoi test;
- programmation.

### Inbox

Boite de reception:

- conversations entrantes;
- filtres;
- details du message;
- reponse avec expediteur autorise;
- pieces jointes;
- notes internes.

### Settings

Configuration:

- domaines;
- expediteurs;
- providers;
- API keys;
- webhooks;
- quotas;
- roles;
- securite.

## Ce que le produit ne doit pas faire

- Usurper une adresse email non verifiee.
- Permettre l'envoi massif sans consentement.
- Contourner SPF, DKIM, DMARC ou les politiques providers.
- Masquer l'identite reelle d'un expediteur.
- Ignorer les bounces, plaintes et desabonnements.

