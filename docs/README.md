# LearningWar — Documentation

This folder contains the architecture spike and engineering reference for the LearningWar project.

## Start Here

If you're a new agent or developer picking up this project, read in this order:

| # | Document | What you'll learn |
|---|---|---|
| 1 | [`architecture/00-project-overview.md`](./architecture/00-project-overview.md) | What the product is, the full tech stack, repo layout, code conventions, navigation map |
| 2 | [`architecture/01-data-model.md`](./architecture/01-data-model.md) | Every database table, RLS policies, triggers, migration history |
| 3 | [`architecture/02-features.md`](./architecture/02-features.md) | Deep-dive on every feature: Porch, AI Sessions, Prep Runner, Ranks, Mentor Inbox, PWA |
| 4 | [`architecture/03-known-bugs.md`](./architecture/03-known-bugs.md) | Confirmed bugs with root cause + exact SQL/code fixes — **start here for bug work** |
| 5 | [`architecture/04-conventions.md`](./architecture/04-conventions.md) | Hard rules for writing code: component structure, RLS checklist, pitfalls |

## Top Priority Bug (Fix This First)

**BUG-01** in `03-known-bugs.md` — `prep_sessions` has no RLS policies. This causes `savePrepProgress()` and `finalizePrepQA()` to silently fail, meaning users lose all their session results. The fix is a 4-policy SQL block that takes 2 minutes to run.

## Internal Product Docs

Broader product context lives in `internal-docs/`:
- `learningwar_complete_PRD.md` — full product requirements document
- `learningwar_market_analysis.md` — market positioning
- `learningwar_migration.sql` — supplemental SQL reference
