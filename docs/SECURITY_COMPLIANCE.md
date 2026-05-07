# Securite et conformite

## Politique expediteur

Le systeme doit seulement autoriser des expediteurs verifies.

Regles:

- un utilisateur ne peut pas envoyer depuis une adresse qu'il ne controle pas;
- chaque domaine doit etre verifie par DNS;
- chaque alias doit appartenir a un domaine verifie ou etre confirme;
- les changements d'expediteur sont journalises;
- les domaines suspects peuvent etre suspendus.

## Delivrabilite

Obligatoire:

- SPF;
- DKIM;
- DMARC;
- gestion des bounces;
- gestion des plaintes;
- lien de desabonnement pour les emails marketing;
- suppression list globale par organisation;
- limites de volume par domaine et organisation.

## Anti-abus

Le SaaS doit inclure:

- rate limiting par organisation, cle API, domaine et IP;
- detection de volume anormal;
- blocage automatique apres plaintes elevees;
- validation des destinataires;
- scan basique des pieces jointes;
- blocage des fichiers dangereux;
- audit des exports;
- suspension manuelle par admin.

## Donnees personnelles

Prevoir:

- consentement pour emails marketing;
- suppression des contacts;
- export de donnees;
- retention configurable;
- chiffrement des secrets providers;
- masquage partiel des cles API;
- journaux d'audit.

## API keys

Regles:

- hash des cles en base;
- prefix lisible pour identification;
- permissions par cle;
- expiration optionnelle;
- rotation;
- revocation immediate.

## Webhooks

Regles:

- signature HMAC;
- timestamp anti-replay;
- retries avec backoff;
- journal des erreurs;
- endpoint testable depuis l'interface.

