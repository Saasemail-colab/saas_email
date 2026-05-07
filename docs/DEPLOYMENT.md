# Deploiement Railway ou Render avec Supabase

## 1. Creer la base Supabase

1. Creer un projet sur Supabase.
2. Ouvrir SQL Editor.
3. Executer les migrations dans l'ordre:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_deliverability_controls.sql`
   - `supabase/migrations/0003_multi_provider.sql`
4. Adapter puis executer `supabase/seed.sql` pour creer une organisation, un domaine et un expediteur de test.
5. Recuperer:
   - `Project URL`
   - `anon public key`
   - `service_role key`

## 2. Configurer Resend

Pour le MVP, le provider d'envoi est Resend.

1. Creer un compte Resend.
2. Ajouter et verifier un domaine.
3. Recuperer la cle API.
4. Verifier que le meme domaine et le meme expediteur existent dans Supabase avec `status = 'verified'`.

## 3. Variables d'environnement

Ajouter ces variables sur Railway ou Render:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RESEND_API_KEY=re_xxxxxxxxx
DEFAULT_FROM_EMAIL=no-reply@your-verified-domain.com
NEXT_PUBLIC_APP_URL=https://your-app-url.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SENDGRID_API_KEY=SG.xxxxxxxxx
MAILGUN_API_KEY=key-xxxxxxxxx
MAILGUN_DOMAIN=mg.your-verified-domain.com
POSTMARK_SERVER_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BREVO_API_KEY=xkeysib-xxxxxxxxx
MAILERSEND_API_KEY=mlsn.xxxxxxxxx
```

## 4. Deploiement Railway

1. Connecter le repo GitHub a Railway.
2. Railway detecte `railway.json`.
3. Ajouter les variables d'environnement.
4. Deploy.

Commandes utilisees:

```bash
npm install && npm run build
npm run start
```

## 5. Deploiement Render

1. Connecter le repo GitHub a Render.
2. Render detecte `render.yaml`.
3. Renseigner les variables marquees `sync: false`.
4. Deploy.

Si Render utilise les commandes du dashboard au lieu de `render.yaml`, regler:

```bash
Build Command: npm install && npm run build
Start Command: npm run start
Node Version: 20
```

Eviter Node 24 pour ce projet. Next.js 14 et plusieurs dependances sont plus stables sur Node 20 LTS.

## 6. Tester l'API d'envoi

```bash
curl -X POST https://your-app-url.com/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "from": "support@your-verified-domain.com",
    "to": "client@example.com",
    "subject": "Test",
    "html": "<p>Bonjour depuis EmailOps</p>",
    "text": "Bonjour depuis EmailOps",
    "audience": "transactional",
    "replyTo": "support@your-verified-domain.com"
  }'
```

L'expediteur doit exister dans `sender_identities` avec `status = 'verified'`.
