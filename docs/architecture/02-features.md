# LearningWar — Feature Deep-Dive

> Each section covers: what the feature does, which files own it, the data flow, and any quirks to know.

---

## 1. Daily Porch (Accountability Journaling)

### What It Is
The core habit loop. Each day, users write a short journal entry covering:
- **What they learned** (required)
- **Challenges** they faced (optional)
- **Tomorrow's plan** (optional)
- **Mood** (optional, 1–4 scale)
- **Visibility** — public (shows in the community feed) or private

One post per user per day — enforced by a UNIQUE constraint on `(user_id, post_date)`. The upsert pattern means users can edit the day's entry at any time.

### Files
| File | Role |
|---|---|
| `app/dashboard/porch-actions.ts` | All server actions: `createPost`, `updatePost`, `deletePost`, `createComment`, `toggleLike`, `getPost`, `getMorePosts`, `getFilteredPosts` |
| `components/PorchFeed/` | Top-level feed container — fetches initial posts server-side |
| `components/PorchFeedList/` | Paginated list with "Load more" and filter/search |
| `components/PorchForm/` | Create/edit post form (client component) |
| `components/PostCard/` | Individual post display: content, author, comments, reactions |
| `components/ReactionIcons/` | Spartan-themed reaction buttons (spartan 🛡, lion 🦁, wolf 🐺) |

### Data Flow
1. User submits `PorchForm` → calls `createPost(formData)` server action
2. `createPost` upserts into `porch_posts` with today's date as `post_date`
3. DB trigger `on_porch_post_created` fires → inserts `learning_activity` row + upserts `streaks`
4. `revalidatePath('/dashboard')` clears the RSC cache
5. Dashboard re-renders with fresh data

### Feed Pagination
- Initial load: 20 posts (server-rendered)
- "Load more": `getMorePosts(offset)` called from client component
- Filter: `getFilteredPosts({ offset, filter: 'all'|'mine', search })` — search finds users by username/full_name then filters by their IDs

### Social Layer
- Comments: any authenticated user can comment on others' posts (not their own)
- Reactions: any authenticated user can react to others' posts (not their own). Toggling the same reaction removes it; switching reaction updates it.

---

## 2. Knowledge Check Sessions (AI Quiz)

### What It Is
An AI-generated quiz. Users pick a topic, difficulty, question count, and time limit. The AI generates a mix of **multiple-choice** and **open-ended** questions. The session is resumable — if the user closes the tab mid-session, it can be picked back up.

### Session Lifecycle
```
startSession() → persists row with status='in_progress'
     │
     ▼
User navigates questions
     │
     ▼ (every 15s + on navigation)
saveSessionProgress() → UPDATE sessions SET details, answered_count, duration_left_seconds
     │
     ▼ (on Submit or timer runs out)
submitSession() → evaluates answers, sets status='completed', score, details={results}
```

### Question Types
Defined in `lib/quizConstants.ts`:
- **`multiple_choice`**: 4 options, `correctIndex` pre-computed by AI
- **`open_ended`**: Free text answer, graded by `gradeOpenEnded()` against a rubric

### Difficulties
`'basic' | 'medium' | 'advanced' | 'expert' | 'legend'` (defined in `lib/quizConstants.ts`)

### Files
| File | Role |
|---|---|
| `app/dashboard/sessions/session-actions.ts` | `startSession`, `saveSessionProgress`, `getInProgressSession`, `abandonSession`, `submitSession`, `getSessionHistory`, `deleteSession` |
| `lib/anthropic.ts` | `generateQuizQuestions()` (claude-sonnet-5), `gradeOpenEnded()` (claude-haiku-4-5) |
| `components/SessionRunner/` | Full interactive quiz UI (client component) |
| `components/SessionHistory/` | List of completed sessions |

### AI Models Used
- Question generation: `claude-sonnet-5` (higher quality, more expensive)
- Answer grading: `claude-haiku-4-5-20251001` (faster, cheaper — per-answer calls)

---

## 3. Prep Runner (AI-Powered Practice Sessions)

### What It Is
Structured practice for interviews, sales calls, and pitches. Unlike the quiz, Prep sessions are always open-ended and scored on four dimensions: overall, relevance, clarity, completeness.

Three **tracks**: `interview`, `sales`, `pitch`  
Two **modes**: `qa` (live Q&A with scoring) | `guide` (generates a structured study guide)

### Session Lifecycle (Q&A mode)
```
startPrepQA() → generates questions via AI, persists row with status='in_progress'
     │
     ▼
User answers questions (autosave every 15s via savePrepProgress())
     │
     ▼ (on Submit or timer runs out)
finalizePrepQA() → evaluates each answer via AI, UPDATE prep_sessions SET status='completed'
```

### Resumption Flow
On page load, `getInProgressPrepSession()` checks for an in-progress session. If found, `PrepRunner` renders a resume/discard prompt. Resuming restores: track, topic, role, difficulty, questions, saved answers, remaining timer.

### Key Data Point
`PrepRunner` (client component) uses two refs + two `useEffect` hooks:
- `secondsLeft` countdown ticker (fires every 1s while in `qa` stage)
- Autosave interval (fires every 15s while in `qa` stage with a live `sessionId`)
- Both use `answersRef` and `secondsLeftRef` to always capture the latest values without stale closures

### Files
| File | Role |
|---|---|
| `app/dashboard/prep/prep-actions.ts` | `startPrepQA`, `savePrepProgress`, `getInProgressPrepSession`, `abandonPrepSession`, `finalizePrepQA`, `generatePrepGuideSession`, `getPrepHistory`, `deletePrepSession`, `getRecentPorchTopics` |
| `lib/prepAI.ts` | `generatePrepQuestions()` (claude-sonnet-5), `evaluatePrepAnswer()` (claude-haiku-4-5-20251001), `generatePrepGuide()` (claude-sonnet-5) |
| `lib/prepConstants.ts` | `PrepTrack`, `PrepMode`, `TRACK_META`, `MODE_META`, `PrepQuestion`, `PrepAnswerResult` |
| `components/PrepRunner/` | Full interactive UI with setup form, Q&A stage, guide stage, results stage |
| `components/PrepHistory/` | List of completed prep sessions |

### Recent Topics Integration
`getRecentPorchTopics()` fetches the last 10 `what_learned` strings from the user's porch posts and surfaces them as quick-select chips in the Prep setup form. Bridges the journaling and practice features.

---

## 4. Rank Progression System

### What It Is
Ten Spartan-themed ranks based on **current streak** (not total posts, not total points — specifically `current_streak` from the `streaks` table).

### Ranks (from `lib/porchLevels.ts`)

| Level | Name | Min Streak | Description |
|---|---|---|---|
| 0 | **Paides** | 0 | Young trainee learning discipline |
| 1 | **Paidiskoi** | 21 | Advanced trainee |
| 2 | **Hebon** | 41 | Young adult in serious training |
| 3 | **Eiren** | 61 | Junior leader |
| 4 | **Hoplite** | 81 | Full citizen-soldier |
| 5 | **Hippeis** | 101 | Elite 300 — king's guard |
| 6 | **Lochagos** | 121 | Company commander |
| 7 | **Polemarch** | 141 | Senior general |
| 8 | **Ephor** | 161 | Supreme overseer |
| 9 | **Spartan Legend** | 180 | Legendary consistency |

### Computation
`getPorchLevel(streak: number): PorchLevel` — linear scan through `PORCH_LEVELS` returning the highest level whose `minStreak ≤ streak`.

### Streak Engine
Two streak systems coexist:
1. **DB-side** (`streaks` table, updated by trigger) — authoritative, used for badge display
2. **Client-side** (`lib/porchStreak.ts::calculatePorchStreak()`) — takes a `Set<string>` of date strings, computes current + longest in JS

The DB trigger recomputes on every `porch_post` INSERT. It handles:
- Same day: streak stays the same (idempotent)
- Yesterday was active: streak increments
- Anything else: streak resets to 1

### Components
- `RankLadder` — visual display of all 10 ranks with current rank highlighted
- `ProfileHeader` — shows current rank badge + streak count

---

## 5. Heatmap & Calendar

### Heatmap
The `HeatmapGrid` component renders a GitHub-style activity heatmap.
- Data source: `daily_points` view → `heat_level` (0–4)
- `heat_level = LEAST(4, CEIL(total_points / 2))` — 2 points (one porch post) = heat level 1; 4 points = heat level 2; max 4
- Keyed off `activity_date`, which comes from `porch_posts.post_date` — reflects when learning happened

### Calendar
`LearningCalendar` provides a month-view calendar showing active days. Also uses `post_date` (not `created_at`) for this reason: a user could submit their post at midnight about something they learned the day before.

---

## 6. Mentor–Student System

### Structure
- **Roles:** `student` (default) < `junior_mentor` < `mentor` < `admin`
- **Assignment:** Admin uses the admin panel to assign a mentor to a student via `assignMentorAdmin()` → calls `assign_mentor` RPC
- **One active mentor per student** — enforced by partial unique index

### Mentor Inbox
The mentor's primary touchpoint. Located at `/dashboard/inbox`.

1. `MentorStudentList` — shows all active students with unread message counts
2. `/dashboard/inbox/[studentId]` — threaded wall view

### Message Wall
Each student has a "wall" of messages (`mentor_messages`) — threaded (via `parent_id`), ordered chronologically. Both student and mentor(s) can post. The `read_at` field tracks when messages were seen.

### Files
| File | Role |
|---|---|
| `app/dashboard/inbox-actions.ts` | `getWallMessages`, `postWallMessage`, `markWallRead`, `getMentorStudentList`, `getMyMentor` |
| `app/dashboard/admin-actions.ts` | `getAllProfiles`, `getMentorAssignmentsMap`, `updateUserRole`, `assignMentorAdmin` |
| `components/MentorStudentList/` | Inbox list with unread badge |
| `components/MessageThread/` | Threaded wall UI |
| `components/MentorCard/` | Single mentor display card |
| `components/UserRoleManager/` | Admin panel for role + assignment changes |

---

## 7. Authentication & Auth Pages

### Auth Flow
- Sign-up with email + password confirmation
- Sign-in with email + password
- Forgot password → email link → `auth/callback` route → session exchange
- All auth pages are Spartan-themed (warrior hero images, branded colors)

### Auth UI Components
- `AuthBackground` — full-page background (warrior image)
- `AuthCard` — centered card container
- `AuthHeader` — logo + title
- `AuthHero` — hero panel with warrior image (desktop only)
- `SignInForm`, `SignUpForm`, `ForgotPasswordForm` — form client components

### Middleware
`middleware.ts` runs `updateSession()` on every request (except static assets, service worker, icons, images). This refreshes the Supabase session token in the cookie so it doesn't expire mid-visit.

---

## 8. PWA Support

### Configuration
- `public/manifest.json` — name, icons (192×192, 512×512 + maskable), `start_url: /dashboard`, theme blue `#1a6fca`
- `public/sw.js` — service worker (caches static assets)
- `components/RegisterServiceWorker/` — client component that registers the SW on mount
- `RegisterServiceWorker` is mounted in the root `app/layout.tsx`

### Viewport / Metadata
Set in `app/layout.tsx`:
```ts
export const viewport: Viewport = {
  themeColor: '#1a6fca',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
```

---

## 9. Admin Panel

### What It Does
- Lists all users with their current role
- Lets admin change any user's role (`updateUserRole` → `admin_set_role` RPC — note: this RPC needs to exist in Supabase)
- Lets admin assign a mentor to a student

### Access
Route `/dashboard/admin` — there is no middleware-level role check visible in the codebase. Role enforcement happens via Supabase RLS policies on the tables the admin actions touch. The UI itself likely uses the `UserRoleManager` component which presumably conditionally renders based on role.

---

## 10. Profile

### What It Does
- Edit `full_name`, `username`, `bio`, `avatar_url`, `timezone`, `calendar_public`, `show_email`
- Displays rank, streak, longest streak, total posts

### Files
| File | Role |
|---|---|
| `app/dashboard/profile/page.tsx` | Server component — fetches profile + stats |
| `app/dashboard/profile/profile-actions.ts` | `updateProfile` server action |
| `components/ProfileForm/` | Editable fields (client component) |
| `components/ProfileHeader/` | Rank badge, streak, stats display |
