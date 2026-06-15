# DataSage Port + Premium Redesign

You uploaded the real DataSage frontend (`zipp.zip`) and backend (`backend.zip`). The frontend is **Next.js 15 App Router + Supabase + Zustand**, and this Lovable project is **TanStack Start (Vite + React 19)** — so this is a full port, not a copy/paste. The backend (FastAPI) is reference only; it stays where it runs and the frontend hits it over HTTP via `VITE_API_URL`.

## Scope

**Carry over unchanged (business logic):**
- `lib/api.ts` — fetch wrapper, auth header, 401/refresh retry (rename `NEXT_PUBLIC_API_URL` → `VITE_API_URL`)
- `lib/types.ts` — all DTOs
- `lib/supabase/client.ts` — browser Supabase client
- `store/{authStore,sessionStore,preferenceStore}.ts` — Zustand stores
- `hooks/useSessionStatus.ts` — polling hook
- All chart logic (`components/charts/*`), insights, forecast, dashboard math

**Translate (framework-specific):**
- `app/layout.tsx` → `src/routes/__root.tsx` (providers, theme, toaster)
- `app/page.tsx` (landing/upload) → `src/routes/index.tsx`
- `app/login`, `app/signup`, `app/forgot-password` → `src/routes/{login,signup,forgot-password}.tsx`
- `app/dashboard/[sessionId]/page.tsx` → `src/routes/dashboard.$sessionId.tsx`
- `app/history/page.tsx` → `src/routes/_authenticated/history.tsx`
- `app/auth/callback/route.ts` (Supabase OAuth) → `src/routes/api/auth/callback.ts` server route
- `middleware.ts` (route protection) → `_authenticated` layout gate (already idiomatic in this template)
- `lib/supabase/server.ts` (Next cookies) → drop; auth runs client-side via the existing browser client + bearer attacher pattern
- Drop `test_*.js`, `next.config.ts`, `next-env.d.ts`, Next favicon plumbing

**Premium redesign (Linear × Vercel × Raycast):**
- New design tokens in `src/styles.css`: refined neutral scale, single accent, OKLCH-based dark + light themes, elegant shadows, motion-friendly radii
- Extend shadcn primitives (Button, Card, Input, Dialog, Badge, Tabs, Skeleton) with premium variants
- App shell: sticky translucent topbar w/ subtle border, command-bar feel, breadcrumbs, user menu, theme toggle
- Landing/upload: large hero, dropzone with magnetic hover, preference cards as bento grid
- Dashboard: tabbed workspace (Overview / Charts / Insights / Forecast / Chat / Downloads), animated pipeline status rail, stat cards w/ trend chips, chart gallery with lightbox
- History: dense list w/ status pills, hover preview, empty state
- Auth pages: centered card, gradient mesh background, social + email
- Motion via `motion/react` (already premium feel — fades, layout transitions, view transitions on route change)
- Fully responsive, dark/light parity, zero hardcoded colors

## Technical notes (for reference)

- TanStack route filenames use dot-separated paths; dynamic segments use `$param`.
- Supabase OAuth callback becomes a server route at `src/routes/api/auth/callback.ts` exchanging `code` for a session, then redirecting.
- The `_authenticated` layout (`ssr: false` + `beforeLoad` getUser) gates dashboard + history. Public routes (`/`, `/login`, `/signup`, `/forgot-password`) stay top-level.
- Zustand stores work as-is in React 19 — only the import paths change (`@/store/*`).
- `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*` everywhere in client code.
- `next/link`, `next/navigation` → `@tanstack/react-router` `Link` / `useNavigate` / `useParams`.
- Charts use existing Plotly PNG `image_url` flow — no chart-lib swap.
- Enable Lovable Cloud only if you want Supabase managed here; otherwise keep your existing Supabase project and I'll wire `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_API_URL` as secrets you provide.

## Build order

1. Wire env + Supabase client + Zustand stores + `lib/api.ts` + types (no UI yet)
2. Build the new design system (tokens, shadcn variant extensions, AppShell, theme toggle)
3. Auth flow: `/login`, `/signup`, `/forgot-password`, OAuth callback server route, `_authenticated` gate
4. Landing + upload (`/`)
5. Dashboard (`/dashboard/$sessionId`) — tabs, stats, charts, insights, forecast, chat, downloads, pipeline status
6. History (`/history`)
7. Polish pass: motion, empty states, loading skeletons, mobile, dark/light QA

## What I need from you before step 1

1. **Supabase**: use your existing project (give me URL + publishable/anon key) or enable Lovable Cloud and migrate later?
2. **Backend URL** for `VITE_API_URL` (e.g. your deployed FastAPI, or `http://localhost:8000` for local dev only)?
3. **Google OAuth**: keep it? If yes on existing Supabase, I'll wire the callback; on Lovable Cloud I'll use the managed broker.

Reply with answers (or "use Lovable Cloud, skip Google for now, backend at X") and I'll start executing.
