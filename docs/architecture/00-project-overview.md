# LearningWar — Project Overview & Architecture Spike

> **Purpose of this document:** A ground-truth reference so any future agent or developer can pick up the project cold, understand what exists, what is broken, and where to start.  
> **Last updated:** September 2026

---

## 1. What LearningWar Is

LearningWar is a **gamified, social learning platform** that combines:

| Pillar | Description |
|---|---|
| **Daily accountability** | A "Porch" journaling feed where users log what they learned each day |
| **AI practice sessions** | Two separate AI-powered quiz/prep engines — a Knowledge Check quiz and a Prep Runner for interviews/sales/pitches |
| **Mentor–student relationships** | Assigned mentors can view student walls and leave threaded messages |
| **Spartan rank progression** | 10 Agoge-inspired ranks unlocked by sustaining daily streaks |
| **PWA** | Installable as a mobile/desktop app via Web App Manifest + service worker |

The Spartan *agoge* is the conceptual backbone: the platform frames learning consistency as military training, with rank titles borrowed from Spartan hierarchy (Paides → Spartan Legend).

---

## 2. Tech Stack at a Glance

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | **16.2.6** |
| UI Runtime | React | 19.2.4 |
| Database / Auth | Supabase (PostgreSQL + RLS + SSR auth) | `@supabase/ssr ^0.10.3` |
| AI | Anthropic Claude (via `@anthropic-ai/sdk`) | `^0.111.0` |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) | Tailwind `^4` |
| State | Server components first; `zustand` available; `@tanstack/react-query` installed |  |
| Forms | `react-hook-form` + `zod` | — |
| Email | Resend | `^6.12.4` |
| Payments | Stripe (installed, not yet wired to features) | `^22.1.1` |
| Charts | Recharts | `^3.8.1` |
| Package manager | pnpm | — |
| Deployment | Vercel (implied by `eslint-config-next`, `vercel.svg`) | — |

> ⚠️ **This is Next.js 16, not 15 or 14.** APIs and conventions may differ from training data. Always read `node_modules/next/dist/docs/` before writing framework-level code.

---

## 3. Repository Layout

```
learningwar/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (PWA metadata, font, service worker)
│   ├── page.tsx                # Landing / marketing page
│   ├── globals.css             # Global Tailwind styles
│   ├── auth/
│   │   ├── actions.ts          # signUp, signIn, signOut, forgotPassword (server actions)
│   │   ├── callback/route.ts   # OAuth/magic-link code exchange route handler
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── forgot-password/page.tsx
│   └── dashboard/
│       ├── layout.tsx          # Auth guard + Sidebar shell
│       ├── page.tsx            # Main feed (PorchFeed + LearningCalendar)
│       ├── porch-actions.ts    # CRUD for posts, comments, likes (server actions)
│       ├── calendar/page.tsx
│       ├── profile/
│       │   ├── page.tsx
│       │   └── profile-actions.ts
│       ├── sessions/
│       │   ├── page.tsx        # Knowledge Check page
│       │   └── session-actions.ts
│       ├── prep/
│       │   ├── page.tsx        # Prep Runner page
│       │   └── prep-actions.ts
│       ├── inbox/
│       │   ├── page.tsx        # Mentor student list
│       │   └── [studentId]/page.tsx  # Threaded message wall
│       ├── inbox-actions.ts    # Mentor wall CRUD (server actions)
│       ├── admin/page.tsx      # Role + assignment management
│       └── admin-actions.ts    # Admin RPCs: updateUserRole, assignMentorAdmin
│
├── components/                 # UI Components (one folder per component)
│   ├── index.ts                # Barrel re-export (import everything via @/components)
│   ├── ui/                     # shadcn/ui primitives (button, card, input, etc.)
│   └── [ComponentName]/
│       ├── ComponentName.tsx
│       └── index.ts            # export * from './ComponentName'
│
├── lib/                        # Shared utilities and constants
│   ├── index.ts                # Barrel (mixes server + client — see pitfalls)
│   ├── supabase/
│   │   ├── server.ts           # createServerSupabaseClient() — async, uses cookies()
│   │   ├── client.ts           # createClient() — browser-side Supabase client
│   │   └── middleware.ts       # updateSession() — refreshes tokens in middleware
│   ├── anthropic.ts            # generateQuizQuestions(), gradeOpenEnded()
│   ├── prepAI.ts               # generatePrepQuestions(), evaluatePrepAnswer(), generatePrepGuide()
│   ├── porchLevels.ts          # PORCH_LEVELS array + getPorchLevel()
│   ├── porchStreak.ts          # calculatePorchStreak() (client-side utility)
│   ├── porchSelect.ts          # Shared Supabase select string for porch posts
│   ├── prepConstants.ts        # PrepTrack, PrepMode, TRACK_META, MODE_META types
│   ├── quizConstants.ts        # SessionDifficulty, DIFFICULTY_META, QuizQuestion type
│   ├── roleBadge.ts            # Role → badge label helper
│   ├── authTaglines.ts         # Rotating taglines for auth pages
│   └── utils.ts                # cn() (clsx + tailwind-merge)
│
├── types/
│   └── database.ts             # Supabase-generated types (DO NOT hand-edit)
│
├── supabase/                   # SQL migration files (run manually in Supabase SQL Editor)
│   ├── 20260710000000_initial_schema.sql
│   ├── 20260711000000_mentor_inbox.sql
│   ├── 20260712000000_mentor_inbox_consolidate.sql
│   └── 20260712020000_resumable_sessions.sql
│
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/, images/
│
├── internal-docs/              # Product docs (PRD, market analysis, migration notes)
├── middleware.ts               # Supabase session refresh middleware
├── tailwind.config.ts
├── tsconfig.json
└── AGENTS.md / CLAUDE.md       # Agent rules (read before writing any code)
```

---

## 4. Code Conventions (non-negotiable)

1. **Named exports only** — no `export default` anywhere.
2. **Component isolation** — every component lives at `components/ComponentName/ComponentName.tsx` + `components/ComponentName/index.ts` with `export * from './ComponentName'`. Root `components/index.ts` re-exports all.
3. **Import via barrels** — `import { X } from '@/components'` and `import { Y } from '@/lib'`, never deep paths — **except** for client components (see pitfall below).
4. **Server first** — components are RSC by default; `'use client'` only added when browser APIs or interactivity require it.
5. **Always await `createServerSupabaseClient()`** — it is async because it calls `await cookies()`.
6. **SQL migrations are hand-written** and run directly in the Supabase SQL Editor, then committed to `supabase/`.
7. **Type generation**: `supabase gen types typescript --project-id ... > types/database.ts`. Every table must have a `Relationships: []` array or insert/update types degrade to `never`. Commit immediately after regeneration.

### Critical Pitfall — Barrel Import Contamination
The `@/lib` barrel (`lib/index.ts`) exports **both** `createServerSupabaseClient` (server-only, uses `next/headers`) and `createBrowserSupabaseClient`. If a **client component** imports from `@/lib`, it will try to bundle server-only code and crash.

**Rule:** Client components (`'use client'`) must import the browser client directly:
```ts
// ✅ correct in a client component
import { createClient } from '@/lib/supabase/client';

// ❌ will crash — pulls in next/headers
import { createBrowserSupabaseClient } from '@/lib';
```

---

## 5. Navigation & Route Map

| Route | Component | Access |
|---|---|---|
| `/` | `app/page.tsx` | Public landing page |
| `/auth/sign-in` | `SignInForm` | Unauthenticated |
| `/auth/sign-up` | `SignUpForm` | Unauthenticated |
| `/auth/forgot-password` | `ForgotPasswordForm` | Unauthenticated |
| `/auth/callback` | Route handler | Supabase redirect target |
| `/dashboard` | `PorchFeed` + `LearningCalendar` | Auth required |
| `/dashboard/calendar` | `LearningCalendar` detail | Auth required |
| `/dashboard/sessions` | `SessionRunner` + `SessionHistory` | Auth required |
| `/dashboard/prep` | `PrepRunner` + `PrepHistory` | Auth required |
| `/dashboard/profile` | `ProfileForm` + `ProfileHeader` | Auth required |
| `/dashboard/inbox` | `MentorStudentList` | Mentor/Admin only |
| `/dashboard/inbox/[studentId]` | `MessageThread` | Mentor/Admin only |
| `/dashboard/admin` | `UserRoleManager` | Admin only |

The dashboard layout (`app/dashboard/layout.tsx`) does the auth guard: if no Supabase session, redirects to `/auth/sign-in`.

---

## 6. Data Flow Summary

```
Browser                    Next.js Server              Supabase
  │                              │                         │
  │── form submit ──────────────▶│                         │
  │                   server action / route handler         │
  │                              │──── SQL query ─────────▶│
  │                              │◀─── result ─────────────│
  │                   revalidatePath()                      │
  │◀── re-rendered RSC ──────────│                         │
```

- **Server Actions** (marked `'use server'`) handle all mutations. They live co-located with their routes in `app/`.
- **Server Components** (default) do data fetching directly — no client-side fetch calls for initial data.
- **Client Components** (`'use client'`) handle interactive UI: the prep/session runners, porch forms, message threads. They call server actions directly (Next.js action binding).

---

## 7. Authentication Flow

1. **Sign-up** (`auth/actions.ts::signUp`) — calls `supabase.auth.signUp()` with email + password. Triggers confirmation email. A database trigger (`on_auth_user_created`) auto-creates a `profiles` row with `username = email_prefix + '_' + first4ofUUID`.
2. **Sign-in** (`signIn`) — `supabase.auth.signInWithPassword()` → redirect to `/dashboard`.
3. **Password reset** — `forgotPassword()` sends a reset link; the `auth/callback` route handler processes the `?code=` param and calls `exchangeCodeForSession()`.
4. **Session refresh** — `middleware.ts` runs `updateSession()` on every request to keep the Supabase JWT fresh via cookie.
5. **Sign-out** — `signOut()` calls `supabase.auth.signOut()` → redirect to sign-in.

---

## 8. Sub-Documents

| File | Contents |
|---|---|
| [`01-data-model.md`](./01-data-model.md) | Full database schema, relationships, RLS policies, triggers |
| [`02-features.md`](./02-features.md) | Deep-dive on every feature module |
| [`03-known-bugs.md`](./03-known-bugs.md) | Confirmed bugs, root causes, and recommended fixes |
| [`04-conventions.md`](./04-conventions.md) | Code patterns, pitfalls, and engineering lessons |
