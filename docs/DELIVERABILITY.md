# Configuration pour eviter le spam

Objectif: les emails doivent arriver en inbox quand le contenu est legitime. Aucun systeme ne peut garantir 100% inbox, mais ces reglages sont indispensables.

## Domaine

Utiliser un vrai domaine dedie a l'envoi, par exemple:

- `mail.votre-domaine.com` pour transactionnel;
- `news.votre-domaine.com` pour marketing.

Eviter d'envoyer depuis un domaine neuf avec gros volume immediatement.

## DNS obligatoire

Dans Resend, ajouter le domaine puis copier les enregistrements DNS fournis.

Minimum:

```text
SPF   TXT   domaine.com      v=spf1 include:spf.resend.com ~all
DKIM  TXT   resend._domainkey.domaine.com   valeur fournie par Resend
DMARC TXT   _dmarc.domaine.com              v=DMARC1; p=quarantine; rua=mailto:dmarc@domaine.com; adkim=s; aspf=s
```

Pour demarrer, `p=none` peut aider a observer. Pour production, utiliser `p=quarantine`, puis `p=reject` quand tout est stable.

## Provider

Resend doit afficher le domaine en statut verifie. Ensuite, dans Supabase:

1. creer une organization;
2. creer le domaine avec `status = 'verified'`;
3. creer l'expediteur avec `status = 'verified'`.

Exemple SQL:

```sql
insert into organizations (name)
values ('Demo')
returning id;

insert into domains (organization_id, domain, status)
values ('ORG_ID', 'votre-domaine.com', 'verified');

insert into sender_identities (organization_id, email, display_name, status)
values ('ORG_ID', 'support@votre-domaine.com', 'Support', 'verified');
```

## Contenu email

Bonnes pratiques:

- sujet clair, pas trompeur;
- texte et HTML fournis;
- pas trop de liens;
- pas de raccourcisseurs d'URL;
- adresse reply-to valide;
- signature ou informations de contact;
- lien de desabonnement pour marketing;
- ne jamais envoyer a des contacts sans consentement.

## Volumes

Demarrer lentement:

- jour 1: 20 a 50 emails;
- jour 2: 50 a 100;
- semaine 1: augmenter progressivement;
- surveiller bounces et plaintes.

Si plaintes > 0.1%, reduire ou suspendre la campagne.

## API

Pour marketing, envoyer:

```json
{
  "organizationId": "ORG_ID",
  "from": "support@votre-domaine.com",
  "to": "client@example.com",
  "subject": "Votre sujet",
  "html": "<p>Votre message</p>",
  "text": "Votre message",
  "audience": "marketing",
  "replyTo": "support@votre-domaine.com"
}
```

Le systeme ajoute automatiquement `List-Unsubscribe` et bloque les emails presents dans `contact_suppressions`.

