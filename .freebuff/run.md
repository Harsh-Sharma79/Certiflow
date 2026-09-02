# CertiFlow Dev Server

## How to reproduce artifacts

1. Ensure `node_modules/` is present. If not: `npm install`
2. Copy `.env` from the main checkout (or create one with placeholder Supabase values):
   ```
   VITE_SUPABASE_URL=https://placeholder.supabase.co
   VITE_SUPABASE_ANON_KEY=placeholder-anon-key
   SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
   ```

## How to run the server

```bash
nohup node_modules/.bin/vite --port 5173 --host 0.0.0.0 > .freebuff/preview-<session>.log 2> .freebuff/preview-<session>.log.err &
```

- Default port: 5173 (currently running on **5174** because 5173 was occupied)
- The Vite dev server serves the React SPA with HMR
- API routes in `api/` are only available via Vercel; local dev shows the frontend only
