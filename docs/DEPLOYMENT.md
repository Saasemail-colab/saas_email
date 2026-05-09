# Deploiement Render ou Railway

Le guide principal est maintenant a la racine:

```txt
INSTALLATION_ZERO.md
```

## Commandes

Render:

```bash
npm install && npm run build
npm run start
```

Node recommande:

```txt
20.x
```

## Variables essentielles

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:DATABASE_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
ADMIN_ACCESS_CODE=...
ADMIN_SESSION_SECRET=...
EMAIL_PROVIDER=auto
NEXT_PUBLIC_APP_URL=https://ton-app.onrender.com
```

Providers optionnels:

```env
RESEND_API_KEY=re_xxxxx
GMAIL_SMTP_USER=tonadresse@gmail.com
GMAIL_SMTP_PASS=motdepasseapplication
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=https://ton-app.onrender.com/api/oauth/google/callback
GOOGLE_OAUTH_STATE_SECRET=...
CREDENTIAL_ENCRYPTION_KEY=...
```

## Installation Supabase

Apres deploy:

1. ouvre l'app;
2. entre le code admin;
3. lance `Diagnostiquer Supabase`;
4. lance `Installer base Supabase`;
5. relance le diagnostic.

Si le diagnostic dit `password authentication failed`, le probleme est uniquement dans `SUPABASE_DB_URL`.
