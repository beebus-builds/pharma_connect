# PharmaConnect Realtime Service

Persistent WebSocket service for pharmacist ↔ buyer chat.

- **Stack:** Express + Socket.io 4 + Redis Adapter (Upstash) + Prisma + JWT (NextAuth)
- **Port:** 3001 (CORS `CORS_ORIGIN`)
- **Health:** `GET /health`

## Run locally
```bash
cp .env.example .env
# fill DATABASE_URL, NEXTAUTH_SECRET same as web
npm install
npm run dev
```

Web app connects via `NEXT_PUBLIC_REALTIME_URL=http://localhost:3001` (see `src/hooks/useChatSocket.ts`).

## Deploy (Render — free tier)

A `render.yaml` blueprint lives at the repo root. In the Render dashboard: **New > Blueprint**, point it
at this repo, and it will pick up `render.yaml` automatically. It builds `realtime/Dockerfile` using the
`pharmaconnect/` folder as the Docker build context (so it can share `prisma/schema.prisma` without a
monorepo tool).

After the blueprint creates the service, set these env vars in the Render dashboard (marked `sync: false`
in the blueprint, so Render won't ask for them until deploy time):

- `DATABASE_URL`, `DIRECT_URL` — same Neon connection strings as the web app
- `NEXTAUTH_SECRET` — must match the web app's `NEXTAUTH_SECRET` exactly (used to verify chat auth tokens)
- `NEXTAUTH_URL` — your deployed web app URL, e.g. `https://your-app.vercel.app`
- `CORS_ORIGIN` — same as `NEXTAUTH_URL`, so the browser is allowed to open a WebSocket connection
- `REDIS_URL` — optional; only needed once you run more than one realtime instance

Free-tier Render web services spin down after ~15 minutes of inactivity, so the first WebSocket connection
after idle time will be slow (cold start) — acceptable for early traffic, worth upgrading once you have
paying pharmacies depending on chat.

Once deployed, set `NEXT_PUBLIC_REALTIME_URL` in the **web app's** Vercel project settings to the Render
service URL (e.g. `https://pharmaconnect-realtime.onrender.com`).

## Deploy (Fly.io / Railway — alternative)
```bash
fly launch --no-deploy
fly secrets set DATABASE_URL=... NEXTAUTH_SECRET=... REDIS_URL=... CORS_ORIGIN=https://your-web.vercel.app
fly deploy
```

With Upstash Redis, multiple instances scale horizontally via `socket.io-redis-adapter`.
