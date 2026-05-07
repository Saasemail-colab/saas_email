# Support de plusieurs fournisseurs email

Le systeme accepte les destinataires de n'importe quel fournisseur email:

- Gmail;
- Outlook / Hotmail;
- Yahoo;
- Proton;
- Zoho;
- adresses professionnelles;
- domaines personnalises.

Pour les expediteurs, le systeme accepte aussi n'importe quel domaine ou fournisseur, mais l'adresse doit etre verifiee. C'est obligatoire pour eviter l'usurpation, les blocages provider et le spam.

## Providers d'envoi supportes

Le backend supporte actuellement:

- `resend`;
- `smtp`;
- `sendgrid`.
- `mailgun`;
- `postmark`;
- `brevo`;
- `mailersend`.

Le mode SMTP permet de connecter beaucoup de fournisseurs:

- Amazon SES SMTP;
- SendGrid SMTP;
- Mailgun SMTP;
- Brevo SMTP;
- Postmark SMTP;
- Zoho SMTP;
- Google Workspace SMTP relay;
- Outlook / Microsoft 365 SMTP authentifie.

## Configuration globale

Dans Railway ou Render:

```bash
EMAIL_PROVIDER=resend
```

Valeurs possibles:

```bash
EMAIL_PROVIDER=resend
EMAIL_PROVIDER=auto
EMAIL_PROVIDER=smtp
EMAIL_PROVIDER=sendgrid
EMAIL_PROVIDER=mailgun
EMAIL_PROVIDER=postmark
EMAIL_PROVIDER=brevo
EMAIL_PROVIDER=mailersend
```

## Resend

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
```

## SMTP generique

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
```

## SendGrid API

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxx
```

## Mailgun API

```bash
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=key-xxxxxxxxx
MAILGUN_DOMAIN=mg.votre-domaine.com
MAILGUN_BASE_URL=https://api.mailgun.net
```

## Postmark API

```bash
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Brevo API

```bash
EMAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-xxxxxxxxx
```

## MailerSend API

```bash
EMAIL_PROVIDER=mailersend
MAILERSEND_API_KEY=mlsn.xxxxxxxxx
```

## Regle expediteur

Avant envoi, l'API verifie:

1. `sender_identities.email = from`;
2. `sender_identities.status = verified`;
3. le domaine de l'expediteur existe dans `domains`;
4. `domains.status = verified`.

Donc on peut envoyer depuis:

- `support@votre-domaine.com`;
- `billing@client.com`;
- `hello@agence.com`;
- toute adresse professionnelle valide.

Mais on ne peut pas envoyer depuis une adresse non controlee comme `quelquun@gmail.com`, sauf si ce fournisseur permet une verification officielle et que l'adresse est ajoutee comme identite verifiee.

## Ajouter un expediteur au choix

L'utilisateur peut saisir l'adresse expediteur qu'il veut:

```bash
POST /api/senders/register
```

```json
{
  "organizationId": "ORG_ID",
  "provider": "resend",
  "email": "support@votre-domaine.com",
  "displayName": "Support",
  "configureProvider": true
}
```

Le systeme cree:

- le domaine en `pending`;
- l'expediteur en `pending`.

Ensuite il faut verifier le domaine dans le provider choisi et dans les DNS. Une fois verifie, passer le domaine et l'expediteur en `verified`.

L'interface propose aussi un bouton `Marquer verified`, qui appelle:

```bash
POST /api/senders/verify
```

```json
{
  "organizationId": "ORG_ID",
  "email": "support@votre-domaine.com"
}
```

Important: ce bouton marque l'etat local dans Supabase. Le fournisseur email peut encore refuser l'envoi si le domaine n'est pas vraiment verifie chez lui.

## Setup provider direct

Quand `configureProvider` vaut `true`, le backend tente une configuration directe:

- Resend: creation du domaine via API Resend;
- Mailgun: creation du domaine via API Mailgun;
- autres providers: retour d'instructions manuelles, car la verification depend du dashboard/provider.

## Choisir le provider par requete

L'API peut utiliser le provider global `EMAIL_PROVIDER`, ou recevoir un provider:

```json
{
  "organizationId": "ORG_ID",
  "provider": "mailgun",
  "from": "support@votre-domaine.com",
  "to": "client@gmail.com",
  "subject": "Bonjour",
  "html": "<p>Message</p>",
  "text": "Message"
}
```

## Destinataires

Les destinataires ne sont pas limites par provider. L'API accepte toute adresse email valide, sauf si elle est dans `contact_suppressions`.
