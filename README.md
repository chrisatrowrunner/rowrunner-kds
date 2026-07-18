# RowRunner Kitchen (KDS)

The **Kitchen Display System** — app #3 in the RowRunner system. A fixed-landscape
tablet board (Amazon Fire kiosk) for kitchen staff. Shares one Supabase `orders`
table with the fan ordering PWA and the runner dispatch PWA.

React 18 + TypeScript + Vite. Navy `#072E48` / ice `#5BB8D4`, Plus Jakarta Sans —
same brand and stack as `rowrunner-runner`.

## The flow

```
Fan places order ──► KDS "New"  ──Confirm──►  KDS "Preparing"  ──Mark ready──►  Runner queue ──► delivered
                     (confirmed_at)            (ready_at set → leaves the board, becomes claimable)
```

The KDS owns two timestamps on each order:

- **Confirm** sets `confirmed_at = now` → the ticket moves New → Preparing.
- **Mark ready** sets `ready_at = now` → the ticket leaves the board and becomes
  visible to runners (the runner queue now requires `ready_at`).

`printed_at` is reserved for the future headless label print worker.

## Setup

```bash
export PATH="$HOME/.local/node-v24.16.0-darwin-arm64/bin:$PATH"   # Node not on PATH
npm install
npm run dev        # http://localhost:5175  (or the "kds-dev" preview config)
npm run build
```

1. Run [`supabase/kds-columns.sql`](supabase/kds-columns.sql) once in the Supabase
   SQL Editor to add the columns + grants.
2. Kitchen staff sign in with their Supabase auth email/password (same project as
   the runner app). Set `VITE_USE_MOCK=1` in `.env` to demo fully offline.

## Notes

- **No service worker** — the runner app had a painful stale-cache bug from its SW,
  so the KDS ships without one and actively unregisters any stale worker/cache on
  load (see `src/main.tsx`).
- The Supabase anon key in `netlify.toml` is a public, RLS-gated client key — safe
  to commit. `.env` is gitignored.
