# Installation de zero: EmailOps avec Supabase, Resend et Gmail

Ce fichier reprend le deploiement proprement en tenant compte des erreurs rencontrees: variables Supabase manquantes, URL Postgres invalide, tables absentes, Gmail non verifie, et exigences Google OAuth.

## 1. Architecture retenue

Providers gardes:

- `resend`: pour envoyer depuis un domaine que tu controles, par exemple `contact@tondomaine.com`.
- `gmail_smtp`: pour envoyer depuis un seul compte Gmail avec un mot de passe d'application.
- `gmail_oauth`: pour connecter plusieurs comptes Gmail par bouton Google, sans stocker leur mot de passe.
- `auto`: choisit un provider configure disponible.

Providers retires du flux principal: SMTP generique, Mailgun, SendGrid, Postmark, Brevo, MailerSend. Ils ajoutaient trop de variables et de faux diagnostics pendant le deploiement initial.

## 2. Variables Render minimales

Dans Render, ajoute exactement ces variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:DATABASE_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

ADMIN_ACCESS_CODE=choisis-un-code-admin
ADMIN_SESSION_SECRET=une-longue-chaine-secrete-au-moins-24-caracteres

EMAIL_PROVIDER=auto
NEXT_PUBLIC_APP_URL=https://ton-app.onrender.com
NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID=00000000-0000-0000-0000-000000000001
```

Regle importante pour `SUPABASE_DB_URL`:

- le user pooler doit etre `postgres.PROJECT_REF`;
- le port recommande Render est `6543`;
- il doit rester un seul `@` avant `aws-0...`;
- si le mot de passe contient `@`, remplace chaque `@` par `%40`;
- si tu as encore `password authentication failed`, reset le database password dans Supabase puis utilise un mot de passe simple sans caracteres speciaux.

## 3. Gmail SMTP

Active la validation en deux etapes sur le compte Google, puis cree un mot de passe d'application.

Ajoute dans Render:

```env
EMAIL_PROVIDER=gmail_smtp
GMAIL_SMTP_USER=tonadresse@gmail.com
GMAIL_SMTP_PASS=motdepasseapplication16caracteres
```

Dans l'interface, l'expediteur doit etre exactement le meme email que `GMAIL_SMTP_USER`.

## 4. Resend

Resend ne peut pas verifier `gmail.com`. Il faut un domaine que tu controles.

Ajoute dans Render:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

Dans Resend:

1. ajoute ton domaine;
2. copie les DNS SPF/DKIM/DMARC chez ton registrar;
3. attends la verification;
4. dans le SaaS, ajoute un expediteur du meme domaine.

## 5. Gmail OAuth et exigences Google

Google OAuth demande un projet Google Cloud propre.

Dans Google Cloud Console:

1. cree un projet;
2. configure `OAuth consent screen`;
3. ajoute le nom de l'application;
4. ajoute un email support;
5. ajoute le domaine officiel de l'app;
6. ajoute la page d'accueil: `https://ton-app.onrender.com`;
7. ajoute la politique de confidentialite: `https://ton-app.onrender.com/confidentialite`;
8. cree un OAuth Client ID de type Web application;
9. ajoute le redirect URI autorise:

```txt
https://ton-app.onrender.com/api/oauth/google/callback
```

Ajoute dans Render:

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=https://ton-app.onrender.com/api/oauth/google/callback
GOOGLE_OAUTH_STATE_SECRET=une-longue-chaine-secrete-au-moins-24-caracteres
CREDENTIAL_ENCRYPTION_KEY=une-autre-longue-chaine-secrete-au-moins-24-caracteres
```

La page `/confidentialite` existe dans l'app et la page d'accueil contient un lien visible vers cette politique.

## 6. Installer la base Supabase

Apres le premier deploiement:

1. ouvre l'app;
2. entre le code admin;
3. clique `Diagnostiquer Supabase`;
4. si Postgres est OK, clique `Installer base Supabase`;
5. clique encore `Diagnostiquer Supabase`.

Le diagnostic attendu:

```txt
OK NEXT_PUBLIC_SUPABASE_URL
OK SUPABASE_SERVICE_ROLE_KEY
OK Database URL
OK Supabase REST
OK Postgres direct
```

Si `public.domains` manque, les tables ne sont pas installees. Si Postgres refuse le mot de passe, corrige d'abord `SUPABASE_DB_URL`.

## 7. Verification locale du fichier env

Tu peux tester un fichier env avant Render:

```bash
npm run validate:env -- C:\Users\APPOLINAIRE ZANNOU\Downloads\saas_email.env
```

Le script affiche uniquement les statuts, pas les secrets.

## 8. Ordre de deploiement recommande

1. Configurer Supabase et reset le database password si besoin.
2. Mettre les variables Render.
3. Deploy Render avec Node 20.
4. Diagnostiquer Supabase.
5. Installer la base.
6. Configurer Gmail SMTP ou Resend.
7. Ajouter l'expediteur dans l'interface.
8. Envoyer un test.
9. Configurer Google OAuth seulement apres que le domaine et la page confidentialite sont publics.
## 9. Boite de reception SaaS pour les reponses

Les reponses ne peuvent pas revenir dans le SaaS si le destinataire repond directement a une adresse Gmail classique. Pour les centraliser dans EmailOps, configure une adresse entrante dediee, par exemple:

```env
INBOUND_REPLY_TO_EMAIL=replies@ton-domaine.com
INBOUND_WEBHOOK_SECRET=une-cle-secrete-webhook
```

Le SaaS mettra cette adresse dans le header `Reply-To`. Quand le destinataire clique sur Repondre, sa reponse part vers cette adresse entrante.

Configure ensuite ton fournisseur entrant pour appeler ce webhook:

```txt
POST https://ton-app.onrender.com/api/inbound/webhook
Header: x-inbound-secret: une-cle-secrete-webhook
```

Payload JSON accepte:

```json
{
  "organizationId": "00000000-0000-0000-0000-000000000001",
  "from": "client@example.com",
  "to": "replies@ton-domaine.com",
  "subject": "Re: Bonjour",
  "text": "Message de reponse",
  "html": "<p>Message de reponse</p>"
}
```

Apres reception, les messages sont visibles dans le panneau `Inbox SaaS` de l'espace admin.
