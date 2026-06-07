# LearningWar — Complete Product Reference Document
**Domain:** learningwar.com  
**Studio:** Prototype.NEXT  
**Founder:** Slavo Popovic (slavo.io)  
**Stack:** Next.js 14 App Router · Supabase · Claude API · TypeScript · Tailwind · shadcn/ui  
**Model:** Vertical AI Agent Platform for deliberate learners  
**Target ARR:** $3M–$9M (5–10 year horizon)  
**Last updated:** May 2026

---

## What LearningWar Is

A **vertical AI agent platform** — the Harvey of learning. ARI (the AI mentor) runs the entire learning workflow from "I want to learn X" to "I'm job-ready," with daily habits, human mentorship, structured plans, and career intelligence. Not a course platform. Not a quiz app. An operating system for deliberate learning.

**One-liner:**  
> "The only platform that combines an AI mentor available 24/7, a human mentor assigned when you're ready, a daily accountability system, and a career intelligence layer — all in one place."

**Founding story:**  
Slavo mentored developers manually on slavo.io for 3+ years. LearningWar automates and scales that exact model for anyone who wants to learn anything.

---

## Brand Architecture

| Property | Role |
|---|---|
| linkedin.com/in/slavopopovic | Personal brand — trust building, build in public |
| learningwar.com | The product — where people sign up and pay |
| slavo.io | Active community until launch, then founding story page |
| prototypenext.com | Product studio — built LearningWar and other AI products |

**Content rule:** 80% insights (learning, building, mentorship) · 20% LearningWar on personal channels.

---

## The 10 Features

### 1. Knowledge Check — AI Mentor Sessions
**Source:** aripath repo  
**What it is:** The core product. Student picks a topic, ARI starts a Socratic conversation. Not a quiz — a mentor session. ARI asks, listens, explains mistakes, probes deeper, surfaces what the student actually doesn't understand.

**Key behaviors:**
- Topic picker (React hooks, SQL joins, async JS, Spanish verbs, music theory — any topic)
- ARI uses Claude API with streaming (feels conversational, not batch)
- Student rates confidence per answer (1–5)
- Session ends with AI feedback summary + weak spots
- Score saved (0–100) for dashboard skill map
- Auto-suggests next session topic based on plan phase

**DB tables:** `sessions`, `session_messages`

---

### 2. Daily Porch
**Source:** slavo.io repo  
**What it is:** Daily learning log. Students post what they learned, what was hard, their goal for tomorrow. Mentors and cohort members can comment/react. Not a social feed — a shared accountability journal.

**Key behaviors:**
- One post per student per day (enforced by unique DB constraint)
- Three fields: what_learned · challenges · tomorrow
- Mood rating (1–5)
- Public/private toggle
- Comments + emoji reactions from mentors and cohort
- Writing a porch post = +2 activity points (feeds calendar)

**DB tables:** `porch_posts`, `porch_comments`

---

### 3. Learning Calendar — Habit Heatmap
**Source:** slavo.io (calendar feature)  
**What it is:** GitHub-style heatmap showing a full year of learning activity. Each day = a colored cell based on activity points. The accountability spine of the whole app — every other feature writes to it.

**Activity point system:**
- AI session completed = +3 pts
- Porch post written = +2 pts
- YouTube note added = +1 pt
- Mentor message read = +1 pt

**Heatmap levels:**
- 0 pts = empty (grey)
- ≥1 pt = light green
- ≥3 pts = medium green
- ≥5 pts = deep green

**Key behaviors:**
- Click any day → see what happened (session log, porch post)
- Current streak counter (🔥 day count)
- Longest streak badge
- Weekly goal bar ("5 of 7 days active this week")
- Public/private toggle per student
- Mentor can see their students' calendars
- Missed-day nudge: ARI sends reminder after 2+ inactive days (opt-in)

**DB tables:** `learning_activity`, `streaks`  
**DB view:** `daily_points` (pre-computes heatmap level per user per day)

---

### 4. Dashboard
**Source:** slavo.io repo  
**What it is:** Personal learning command center. Shows the full picture at a glance.

**Sections:**
- Current streak + longest streak
- Topics mastered vs weak spots (radar/spider chart)
- Session history log with scores
- Active learning plan progress
- Career goal card (from career analyzer)
- Recent porch posts
- Mentor's last message

**DB tables:** Aggregates from sessions, learning_activity, streaks, porch_posts, learning_reports

---

### 5. Mentor Inbox — Profile Wall
**Source:** ariclear (auth pattern + per-user data flow)  
**What it is:** Each student has a message wall on their profile page. Students leave questions/updates. Assigned mentor (or admin) replies. Threaded conversations, visible only to student + mentor.

**Key behaviors:**
- Student writes message → appears on their profile wall
- Mentor sees all assigned students' walls in one inbox view
- Threaded replies (parent_id FK)
- Read receipts (read_at timestamp)
- Unread badge count on mentor dashboard
- Reading a mentor message = +1 activity point

**DB tables:** `mentor_messages`

---

### 6. YouTube Notes — Video Stops
**Source:** miminotes (Chrome extension concept → native web app)  
**What it is:** Student pastes a YouTube URL. Embedded player appears alongside a notes panel. "Add stop" captures the current timestamp. Clicking a stop scrubs player back to that moment. AI can summarize notes per stop or entire video.

**Key behaviors:**
- Paste YouTube URL → fetch title + thumbnail via YouTube oEmbed API
- YouTube IFrame API for embed + timestamp scrubbing
- "Add stop" button captures current second
- Timestamp auto-formats as MM:SS label (generated column in DB)
- Note field per stop
- AI summary per stop (Claude API call on demand)
- Full video AI summary (all stops summarized together)
- Adding a note = +1 activity point

**DB tables:** `yt_notes`, `yt_stops`

---

### 7. Mentor System
**Source:** slavo.io (operational model)  
**What it is:** The human layer on top of ARI. Three program types mirroring slavo.io's proven model.

**Mentor types:**
- **ARI (AI mentor)** — always on, 24/7, handles all knowledge check sessions
- **Human mentor 1:1** — assigned by admin, async inbox communication, reviews student's calendar + analysis before weekly check-in
- **Human mentor group** — cohort of up to 5 students, shared porch feed, mentor sees all 5 calendars
- **Sprint** — 4–6 week project-based intensive with senior mentor

**Role ladder:**
```
Student (day 0)
  → Junior Mentor (6+ months active, strong session scores — threshold-based)
  → Mentor (manually promoted by admin)
  → Admin (full access)
```

**Key behaviors:**
- Admin assigns mentor to student via `assign_mentor()` function
- Admin promotes student via `promote_to_junior_mentor()` function
- Mentor dashboard: all assigned students, each showing last active date + last analysis
- Graduated students become mentors — the flywheel

**DB tables:** `profiles` (role field), `cohorts`, `user_roles`

---

### 8. AI Learning Analysis
**Source:** ariclear (scan → analyze → report pattern)  
**What it is:** Student or mentor triggers an AI analysis of the student's learning journey over a period. Claude API pulls all porch posts, session scores, mentor feedback, and calendar activity — synthesizes into an honest assessment.

**Four dimensions:**
1. **Accountability score** — "You were active 18 of 30 days (60%)"
2. **Topic coherence** — "You jumped between React, Python, SQL — consider focusing for 2 weeks"
3. **Growth trend** — "Your session scores improved 22% this month"
4. **Mentor feedback patterns** — "Your mentor flagged async JavaScript 3× — prioritize it"

**Key behaviors:**
- Student can run for themselves (personal reflection)
- Mentor can run for any assigned student
- `get_analysis_snapshot()` DB function bundles all data → single JSON → sent to Claude
- Result saved to `learning_reports` with structured JSON breakdown
- Reports viewable historically ("how has my analysis changed month over month")
- Period options: weekly / monthly / custom date range

**DB tables:** `learning_reports`

---

### 9. Learning Plan Engine
**What it is:** Student types any topic + picks duration (3/6/9/12 months) + hours per day available. Claude generates a complete structured learning plan using three pedagogical techniques.

**Three techniques:**
- **Microlearning** — daily 15–20 min focused lessons, not 3-hour marathons
- **Spaced repetition** — automatic review scheduling at increasing intervals (Anki-style, baked into the timeline)
- **Deliberate practice** — each phase ends with a real project that forces application

**Plan structure:**
- Phase breakdown (month by month)
- Daily micro-lessons with specific topics
- Weekly checkpoints ("what you should be able to do")
- Spaced repetition review schedule
- Project for each phase
- Resources per week (docs, YouTube, books)

**Key behaviors:**
- Plan syncs with calendar (heatmap days colored by whether student followed plan)
- AI sessions auto-suggested from current phase topic
- Plan adjusts as student progresses
- Works for any topic — tech, language, music, business, fitness, anything
- User can have multiple plans (different topics)

**DB tables:** `learning_plans` (to be added)

---

### 10. Career Trend Analyzer
**What it is:** Student enters role + location + experience level. Claude with web search tool queries LinkedIn job counts, Glassdoor salary data, Reddit dev community, Stack Overflow survey data, GitHub jobs, Indeed — synthesizes into a career reality report.

**Report output:**
- Demand score
- Average salary range
- Top skills employers actually list
- Red flags + green flags
- Timeline estimate: "realistically job-ready in X months given your current plan"
- Links to matching learning plan

**Key behaviors:**
- Web search tool enabled on Claude API call
- Results saved to `career_reports` table
- 3 reports/month on Solo tier, unlimited on Mentored+
- Timeline estimate connects back to active learning plan

**DB tables:** `career_reports` (to be added)

---

## Complete Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Already in aripath, server components, streaming |
| Language | TypeScript | Already in all repos |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible |
| State | Zustand (light global) + React Query | Session state + server data sync |
| Forms | React Hook Form + Zod | Validation already pattern in repos |
| Charts | Recharts | Radar chart for skill map, heatmap for calendar |
| Video | YouTube IFrame API | Native embed, timestamp scrubbing |
| Auth UI | Supabase Auth UI (custom styled) | Already pattern in aripath |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| API | Next.js Server Actions + Route Handlers | App Router pattern, already used |
| Database | Supabase (Postgres) | Already in all repos, RLS built |
| Auth | Supabase Auth + @supabase/ssr | App Router compatible, middleware ready |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) | Streaming, tool use, already in aripath/ariclear |
| AI streaming | Vercel AI SDK | Simplifies Claude streaming in Next.js |
| Email | Resend | Transactional emails, simple API |
| Payments | Stripe | Subscription billing when paywall launches |
| File storage | Supabase Storage | Avatars, attachments |

### Infrastructure
| Layer | Choice | Reason |
|---|---|---|
| Hosting | Vercel | Already deploy platform, edge functions |
| Database | Supabase Pro | Row Level Security, realtime, edge functions |
| CDN | Vercel Edge Network | Automatic |
| Monitoring | Vercel Analytics + Sentry | Performance + error tracking |
| Domain | learningwar.com | Already owned |

### Key Claude API patterns
```typescript
// Streaming knowledge check session
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// Standard session call
const result = await streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: MENTOR_SYSTEM_PROMPT,
  messages: sessionHistory,
  maxTokens: 1000,
})

// Career analyzer — with web search tool
const result = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  messages: [{ role: 'user', content: careerPrompt }],
  max_tokens: 2000,
})

// Learning analysis — no tools, pure synthesis
const result = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: ANALYSIS_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: JSON.stringify(snapshot) }],
  max_tokens: 2000,
})
```

---

## Complete Database Schema (12 tables)

```
profiles          — users, roles, mentor assignment, cohort
cohorts           — groups of up to 5 students per mentor
sessions          — knowledge check sessions
session_messages  — individual turns within a session
porch_posts       — daily learning log entries
porch_comments    — comments and reactions on posts
yt_notes          — YouTube videos with notes
yt_stops          — individual timestamped stops within a video
mentor_messages   — profile wall messages, threaded
learning_activity — aggregated daily activity (feeds heatmap)
streaks           — materialized streak per user (trigger-updated)
learning_reports  — saved AI analysis results
```

**Two tables to add when building those features:**
```
learning_plans    — generated plans by phase and topic
career_reports    — saved career trend analyzer results
```

**Key DB functions (already in migration):**
- `log_activity()` — idempotent, call from any feature
- `get_analysis_snapshot()` — bundles student data for Claude
- `recalculate_streak()` — trigger on learning_activity insert
- `promote_to_junior_mentor()` — admin only
- `assign_mentor()` — admin only

**SQL migration:** Already generated as `learningwar_migration.sql`

---

## Pricing (when paywall goes live — Phase 2)

| Tier | Monthly | Annual | What's included |
|---|---|---|---|
| Free launch | $0 | $0 | All 10 features, auth-gated |
| Solo | $29/mo | $249/yr | ARI + all features, no human mentor |
| Mentored | $99/mo | $849/yr | Everything + assigned human mentor |
| Intensive | $199/mo | $1,699/yr | Everything + senior mentor + priority |
| Sprint add-on | — | $299 one-time | 4–6 week project with senior mentor |

**Path to $3M ARR:** ~10,000 students at $249–$849/yr average

---

## Build Order — 12 Phases

| Phase | Feature | Est. Time | Notes |
|---|---|---|---|
| 1 | Auth + profiles | Week 1–2 | Supabase Auth, @supabase/ssr, middleware |
| 2 | Role system | Week 2 | user_role enum, RLS policies, admin functions |
| 3 | AI sessions (ARI) | Week 3–6 | Core product, Claude streaming, session save |
| 4 | Daily Porch | Week 7–8 | Post form, feed, comments |
| 5 | Learning Calendar | Week 9–10 | Heatmap, streaks, log_activity() |
| 6 | Learning Plan Engine | Week 11–13 | Claude plan generation, phase sync |
| 7 | Mentor system | Week 14–16 | Cohorts, mentor dashboard, role ladder |
| 8 | Mentor Inbox | Week 17–18 | Profile wall, threaded messages |
| 9 | YouTube Notes | Week 19–21 | YT embed, stops, AI summaries |
| 10 | AI Learning Analysis | Week 22–24 | Analysis engine, report saving |
| 11 | Career Trend Analyzer | Week 25–26 | Web search tool, career report |
| 12 | Dashboard | Week 27–28 | Aggregates everything, skill radar |

**Shippable free product after Phase 5 (week 10):**  
Auth + AI sessions + Porch + Calendar = complete habit loop. Put in front of real students immediately. Build phases 6–12 based on feedback.

---

## Competitive Position

| Feature | Codecademy | Boot.dev | MentorCruise | LearningWar |
|---|---|---|---|---|
| AI mentor 24/7 | Partial | No | No | ✓ (ARI) |
| Human mentor | No | No | Yes ($200–400/mo) | ✓ (included) |
| Daily habit system | No | No | No | ✓ |
| Learning calendar | No | No | No | ✓ |
| AI learning analysis | No | No | No | ✓ |
| Spaced repetition plan | No | No | No | ✓ |
| YouTube notes | No | No | No | ✓ |
| Career trend analyzer | No | No | No | ✓ |
| Any topic | Partial | Backend only | Any | ✓ |
| Annual price | $240 | $249 | $2,400–$4,800 | $249–$1,699 |

---

## The Mission in One Sentence

> LearningWar exists because learning alone is hard, accountability is rare, and good mentorship is expensive. We fix all three.

---

*Built by Slavo Popovic · prototypenext.com · learningwar.com*
