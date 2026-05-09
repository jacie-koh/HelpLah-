# HelpLah SEA-LION Setup

This repo includes a Cloudflare Worker at `cloudflare/sea-lion-worker` so you can host SEA-LION as a simple API without manually creating a Cloudflare Workers AI REST token.

It also exposes Cloudflare Workers AI speech endpoints:

- `POST /chat` for SEA-LION text generation and translation.
- `POST /stream` for SEA-LION streaming text.
- `POST /stt` for speech-to-text using Whisper.
- `POST /tts` for text-to-speech using MeloTTS.

## What You Need

1. A free Cloudflare account at https://workers.cloudflare.com.
2. Wrangler login from your terminal.
3. The deployed Worker URL, usually like:

   `https://helplah-sea-lion.<your-subdomain>.workers.dev`

## Deploy The SEA-LION Worker

```bash
cd cloudflare/sea-lion-worker
npm install
npx wrangler login
npm run deploy
```

After deploy, open the Worker URL. It should print a short “HelpLah SEA-LION Worker is ready” message.

Your current deployed Worker URL:

```text
https://cf-sealion.helplah.workers.dev
```

## Optional: Lock The Worker With A Secret

The Worker can run open, but for HelpLah you should protect it before production:

```bash
cd cloudflare/sea-lion-worker
npx wrangler secret put SEALION_API_KEY
npm run deploy
```

Save the same value in Supabase as `CLOUDFLARE_SEA_LION_API_KEY`.

## Connect Supabase To The Worker

Set these Supabase Edge Function secrets:

```bash
supabase secrets set CLOUDFLARE_SEA_LION_API_BASE="https://cf-sealion.helplah.workers.dev"
supabase secrets set CLOUDFLARE_SEA_LION_API_KEY="<only if you set SEALION_API_KEY>"
```

The existing HelpLah endpoints `/ai/sea-lion`, `/ai/translate`, `/ai/stt`, and `/ai/tts` will use this Worker URL automatically.

## Direct Cloudflare REST Fallback

If you prefer not to deploy a separate Worker, you can instead set:

```bash
supabase secrets set CLOUDFLARE_ACCOUNT_ID="<account id>"
supabase secrets set CLOUDFLARE_API_TOKEN="<workers ai token>"
```

The app supports both modes. The Worker mode is easier because Cloudflare handles the AI binding for you after `wrangler login`.
