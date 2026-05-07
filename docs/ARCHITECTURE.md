# Architecture technique

## Vue d'ensemble

Le SaaS doit etre multi-tenant, oriente evenements et connecte a plusieurs providers email.

Composants recommandes:

- Application web: tableau de bord, composer, inbox, settings.
- API backend: organisations, emails, contacts, domaines, webhooks.
- Worker queue: envoi, retries, parsing entrant, tracking.
- Base de donnees: tenants, domaines, messages, contacts, events.
- Stockage objet: pieces jointes, bodies bruts, exports.
- Cache/queue: Redis, BullMQ, Sidekiq ou equivalent.
- Providers email: Amazon SES, SendGrid, Mailgun, Postmark, Resend, SMTP.

## Flux d'envoi

1. L'utilisateur choisit un expediteur verifie.
2. Le backend valide l'organisation, le domaine, le quota et le consentement.
3. Le message est cree en base avec le statut `queued`.
4. Un job est ajoute dans la queue.
5. Le worker selectionne un provider disponible.
6. Le provider envoie l'email.
7. Les webhooks provider mettent a jour les statuts: delivered, bounced, complained, opened, clicked.
8. Les evenements sont visibles dans le dashboard.

## Flux de reception

1. Le provider recoit un email entrant pour un domaine configure.
2. Le provider appelle un webhook entrant du SaaS.
3. Le backend verifie la signature du webhook.
4. Le message brut et les pieces jointes sont stockes.
5. Le parser extrait expediteur, destinataires, sujet, texte, HTML et headers.
6. Le systeme cree ou met a jour une conversation.
7. L'inbox affiche le message.

## Providers

Le systeme doit utiliser une couche d'abstraction `EmailProvider`.

Methodes minimales:

- `sendEmail(message)`
- `verifyDomain(domain)`
- `createInboundRoute(domain)`
- `parseWebhook(payload, signature)`
- `getSuppressionList()`

Providers possibles:

- Amazon SES: robuste, scalable, bon pour transactionnel.
- Mailgun: bon pour inbound parsing et routing.
- SendGrid: courant pour campagnes et API.
- Postmark: excellent pour transactionnel.
- Resend: simple pour developpeurs.
- SMTP generique: utile mais moins riche pour tracking.

Implementation MVP:

- `EMAIL_PROVIDER=resend` pour Resend;
- `EMAIL_PROVIDER=smtp` pour SMTP generique;
- `EMAIL_PROVIDER=sendgrid` pour SendGrid API.

## Stack recommandee

Option pragmatique:

- Frontend: Next.js, TypeScript, Tailwind CSS.
- Backend: Next.js API routes ou NestJS.
- Database: PostgreSQL.
- ORM: Prisma.
- Queue: Redis + BullMQ.
- Auth: Auth.js, Clerk ou Supabase Auth.
- Storage: S3 compatible.
- Observability: OpenTelemetry + logs structures.

## Services backend

- `TenantService`: organisations et isolation.
- `IdentityService`: domaines, DNS, expediteurs.
- `MessageService`: creation et statut des emails.
- `DeliveryService`: orchestration providers.
- `InboundService`: reception, parsing et conversations.
- `ContactService`: destinataires, listes et suppressions.
- `ComplianceService`: consentement, desabonnement, plaintes.
- `WebhookService`: signatures, retries et evenements.
- `AuditService`: journal des actions sensibles.

## Etats email

- `draft`
- `queued`
- `sending`
- `sent`
- `delivered`
- `deferred`
- `bounced`
- `complained`
- `opened`
- `clicked`
- `failed`
- `cancelled`

## Priorites MVP

1. Envoi via un provider unique.
2. Verification de domaine.
3. API d'envoi transactionnel.
4. Webhooks de statut.
5. Inbox entrante basique.
6. Interface admin pour domaines, expediteurs et logs.
