# LearningWar — Engineering Conventions & Hard-Won Lessons

> Read this before writing any code. These aren't preferences — they're rules derived from real bugs that cost time.

---

## 1. Component Architecture

### The Rule
Every component lives in its own folder:
```
components/
  MyComponent/
    MyComponent.tsx    ← the actual component
    index.ts           ← re-export: export * from './MyComponent'
```

The root `components/index.ts` re-exports everything:
```ts
export * from './MyComponent';
// ...all other components
```

All imports use the barrel:
```ts
import { MyComponent, OtherComponent } from '@/components';
```

**Never** deep-import like `from '@/components/MyComponent/MyComponent'`.

### Named Exports Only
```ts
// ✅ correct
export function MyComponent() { ... }

// ❌ never
export default function MyComponent() { ... }
```

This applies to everything: components, utilities, server actions, constants.

---

## 2. Server vs. Client Components

### Default to Server
Components are React Server Components (RSC) by default. They can be async, use `await`, and call Supabase directly. Do not add `'use client'` unless you need:
- `useState`, `useEffect`, `useRef`
- Browser APIs (`window`, `document`)
- Event handlers that require client-side interactivity

### The Contamination Rule
If a client component (`'use client'`) is a **parent** or **ancestor** in the tree, all its imports must also be client-safe (no `next/headers`, no `server-only`).

**The `@/lib` barrel problem:**
```ts
// lib/index.ts exports this:
export { createServerSupabaseClient } from './supabase/server';
// server.ts uses: import { cookies } from 'next/headers' ← SERVER ONLY
```

If a client component imports from `@/lib`, it will try to bundle `next/headers` and crash.

**Rule for client components:**
```ts
// ✅ Browser Supabase client — safe in client components
import { createClient } from '@/lib/supabase/client';

// ✅ Pure utilities — safe anywhere
import { getPorchLevel } from '@/lib/porchLevels';
import { cn } from '@/lib/utils';

// ❌ Will crash in a client component
import { createServerSupabaseClient } from '@/lib';
```

---

## 3. Supabase Usage

### Server-Side
```ts
import { createServerSupabaseClient } from '@/lib';

// Always await — it calls await cookies() internally
const supabase = await createServerSupabaseClient();

// Always get the user server-side this way
const { data: { user } } = await supabase.auth.getUser();
```

Never use `getSession()` for security-sensitive checks — use `getUser()` which validates against the auth server.

### Mutations Pattern
Server actions always:
1. Call `createServerSupabaseClient()`
2. Call `supabase.auth.getUser()` to authenticate
3. Check ownership before mutating (even when RLS is set — defense in depth)
4. Return `{ error: string }` on failure, `{ success: true }` or data on success
5. Call `revalidatePath()` to invalidate the RSC cache

### Type Generation
```bash
supabase gen types typescript --project-id <PROJECT_ID> > types/database.ts
```

**Warnings:**
- Run this only when authenticated (`supabase login` first)
- Redirecting to the file without being logged in will **silently empty** `database.ts`
- Commit immediately after successful regeneration
- Every table must have `Relationships: []` (even if empty) or insert/update types degrade to `never`

---

## 4. Server Actions

All server actions are co-located with their routes:
```
app/dashboard/porch-actions.ts      ← porch mutations
app/dashboard/prep/prep-actions.ts  ← prep session mutations
app/dashboard/sessions/session-actions.ts
app/dashboard/inbox-actions.ts
app/dashboard/admin-actions.ts
app/auth/actions.ts
```

Server actions must start with `'use server'` directive at the top of the file.

### Pattern
```ts
'use server';

export async function doSomething(arg: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('table').update({ ... }).eq('id', arg).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/...');
  return { success: true };
}
```

---

## 5. Database Migrations

### Rules
1. SQL migrations are hand-written — no auto-generation
2. Run in the Supabase SQL Editor, not via CLI (avoids auth complexity)
3. Save every migration to `supabase/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
4. Never edit a past migration — always write a new one
5. When adding a table, ALWAYS include RLS policies in the same migration

### Migration Naming
```
supabase/
  20260710000000_initial_schema.sql
  20260711000000_mentor_inbox.sql
  20260712000000_mentor_inbox_consolidate.sql  ← consolidation/fix migrations are OK
  20260712020000_resumable_sessions.sql
```

### RLS Checklist (for every new table)
```sql
alter table public.my_table enable row level security;

create policy "my_table_select_..." on public.my_table for select to authenticated using (...);
create policy "my_table_insert_..." on public.my_table for insert to authenticated with check (...);
create policy "my_table_update_..." on public.my_table for update to authenticated using (...);
create policy "my_table_delete_..." on public.my_table for delete to authenticated using (...);
-- If a CRUD op is intentionally absent (e.g. app never deletes), document why
```

---

## 6. Styling

- Tailwind CSS v4 (new `@import "tailwindcss"` syntax, no `tailwind.config` content array)
- shadcn/ui components in `components/ui/` — Radix primitives with Tailwind styling
- Brand color: `#1a6fca` (Spartan blue) — used inline in most component files
- `cn()` from `lib/utils.ts` for conditional class merging (`clsx` + `tailwind-merge`)

---

## 7. TypeScript

### Generic Syntax Warning
Angle brackets in TypeScript generics (`Record<K, V>`, `Array<T>`, `useState<T>`) can be **silently dropped** when pasting text (e.g. from some chat interfaces or code formatters). Always manually verify after pasting TypeScript generics.

### Working with Database Types
```ts
import type { Database } from '@/types/database';

type PostInsert = Database['public']['Tables']['porch_posts']['Insert'];
type PostRow = Database['public']['Tables']['porch_posts']['Row'];
```

---

## 8. AI Integration

### Models in Use
| Use case | Model |
|---|---|
| Quiz question generation | `claude-sonnet-5` |
| Open-ended answer grading | `claude-haiku-4-5-20251001` |
| Prep question generation | `claude-sonnet-5` |
| Prep answer evaluation | `claude-haiku-4-5-20251001` |
| Prep guide generation | `claude-sonnet-5` |

### Response Parsing
Both `lib/anthropic.ts` and `lib/prepAI.ts` use a `extractJSON()` helper that strips markdown fences before parsing:
```ts
function extractJSON(text: string) {
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
```

All prompts instruct the model to "Respond ONLY with valid JSON, no markdown fences". The `extractJSON` is a safety net.

### Rate Limiting / Cost
- Each question generation call uses `max_tokens: 1500`
- Each answer grading call uses `max_tokens: 400`
- A 9-question session does: 1 generation call + 9 grading calls = 10 Anthropic API calls per session
- No rate limiting or cost controls are currently in place

---

## 9. Turbopack / Dev Server

### Known Issue: Module Graph Caching
When switching between server and client module boundaries (e.g. adding `'use client'`, changing barrel exports), Turbopack can get confused and show stale errors. If you see bizarre import errors that shouldn't exist:
1. Stop the dev server
2. Delete `.next/`
3. Run `pnpm dev` fresh

This resolves most "module not found" or "server-only" errors that appear after refactoring.

---

## 10. Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or prod URL
```

Optional (Stripe — not wired to features yet):
```
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

Optional (Resend — email):
```
RESEND_API_KEY=...
```

---

## 11. Git & Deployment

- Hosted on Vercel (inferred from build setup)
- No CI/CD configuration files visible — likely using Vercel's GitHub integration
- No testing framework is installed — no `jest`, `vitest`, `playwright`, etc.
- The project is a private git repo

---

## Quick Reference: "I want to..."

| Task | Where to look |
|---|---|
| Add a new server action | Create/edit `app/[feature]/[feature]-actions.ts`, add `'use server'` |
| Add a new component | `components/NewThing/NewThing.tsx` + `index.ts` + add to `components/index.ts` |
| Add a database table | Write SQL, run in Supabase SQL Editor, save to `supabase/TIMESTAMP_name.sql`, regenerate types |
| Fix a silent RLS failure | Check `pg_policies` for the table, add the missing policy |
| Add AI functionality | Use `lib/anthropic.ts` or `lib/prepAI.ts` pattern — `server-only`, Anthropic SDK, `extractJSON()` |
| Understand the rank system | `lib/porchLevels.ts` — `PORCH_LEVELS` array + `getPorchLevel()` |
| Debug a "next/headers" error | You imported a server-only module in a client component — trace the import chain |
| Add a new route | Create `app/[path]/page.tsx` (RSC), optionally `app/[path]/[feature]-actions.ts` |
