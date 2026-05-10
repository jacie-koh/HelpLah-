# Railway deployment

This repo is ready to deploy the HelpLah frontend on Railway.

## Railway dashboard

1. Create a new Railway project.
2. Choose **Deploy from GitHub repo**.
3. Leave the Railway root directory as the repository root.

4. Railway will use the root `railway.toml`.

Build command:

```bash
cd "KampongSG Mobile App Design" && npm ci && npm run build && npm prune --omit=dev
```

Start command:

```bash
cd "KampongSG Mobile App Design" && npm run start
```

For local development, run this inside `KampongSG Mobile App Design`:

```bash
npm install
npm run dev
```

The app still uses the existing Supabase Edge Function backend:

```text
https://eryrjmodbspncqsnzrnn.supabase.co/functions/v1/make-server-fd25410b
```

No Railway secret is needed for the frontend unless we later move Supabase IDs into environment variables.
