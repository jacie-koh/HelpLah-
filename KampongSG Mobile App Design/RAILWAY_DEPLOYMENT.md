# Railway deployment

This folder is ready to deploy the HelpLah frontend on Railway.

## Railway dashboard

1. Create a new Railway project.
2. Choose **Deploy from GitHub repo**.
3. Set the Railway root directory to:

   ```text
   KampongSG Mobile App Design
   ```

4. Railway will use `railway.toml` and `nixpacks.toml`.

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm run start
```

The app still uses the existing Supabase Edge Function backend:

```text
https://eryrjmodbspncqsnzrnn.supabase.co/functions/v1/make-server-fd25410b
```

No Railway secret is needed for the frontend unless we later move Supabase IDs into environment variables.
