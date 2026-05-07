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
EMAIL_PROVIDER=smtp
EMAIL_PROVIDER=sendgrid
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

## Destinataires

Les destinataires ne sont pas limites par provider. L'API accepte toute adresse email valide, sauf si elle est dans `contact_suppressions`.
