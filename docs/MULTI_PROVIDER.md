# Providers email retenus

Le SaaS utilise volontairement peu de providers pour rester fiable au deploiement:

- `resend`: domaines verifies par DNS;
- `gmail_smtp`: un compte Gmail avec mot de passe d'application;
- `gmail_oauth`: plusieurs comptes Gmail connectes par OAuth;
- `auto`: detection des providers configures.

## Regle expediteur

Un expediteur doit toujours etre verifie dans Supabase avant l'envoi:

1. `sender_identities.email = from`;
2. `sender_identities.status = verified`;
3. le domaine existe dans `domains`;
4. `domains.status = verified`.

Cette regle evite l'usurpation d'identite et les blocages SPF/DKIM/DMARC.

## Resend

Variables:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
```

Resend ne peut pas verifier `gmail.com`. Il faut utiliser un domaine controle, par exemple `contact@tondomaine.com`.

## Gmail SMTP

Variables:

```env
EMAIL_PROVIDER=gmail_smtp
GMAIL_SMTP_USER=tonadresse@gmail.com
GMAIL_SMTP_PASS=motdepasseapplicationgoogle
```

L'expediteur doit etre exactement le meme que `GMAIL_SMTP_USER`.

## Gmail OAuth

Variables:

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=https://ton-app.onrender.com/api/oauth/google/callback
GOOGLE_OAUTH_STATE_SECRET=une-longue-chaine-secrete
CREDENTIAL_ENCRYPTION_KEY=une-autre-longue-chaine-secrete
```

Chaque compte Gmail est connecte par le bouton `Connecter Gmail`. Le SaaS stocke le refresh token chiffre et envoie via l'API Gmail.

## Destinataires

Les destinataires peuvent etre Gmail, Outlook, Yahoo, Proton, Zoho ou n'importe quel domaine valide. La verification concerne surtout l'expediteur.
