# NOBA AI backend

This small Node server keeps the OpenAI API key off the mobile app.

## Run locally

```bash
OPENAI_API_KEY=your_key node server.mjs
```

Then set the Expo build variable:

```bash
EXPO_PUBLIC_AI_BACKEND_URL=https://YOUR-BACKEND.example.com
```

For a real phone, do not use `localhost`; use a reachable LAN address for local testing or deploy the backend over HTTPS.

## Endpoints

- `GET /api/health` — health check.
- `POST /api/chat` — Zohreh online AI.
- `POST /api/music-search` — searches the public iTunes Search API and returns provider-supplied song previews.

The music endpoint returns preview URLs supplied by the provider; it does not download, bypass, or unlock full copyrighted tracks.

## Production

Deploy `server.mjs` to a Node-compatible HTTPS host and set `OPENAI_API_KEY` as a server secret. Never put the API key in the mobile app or commit it to GitHub.
