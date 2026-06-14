# Axom

**From confused to confident, before the exam.**

Axom is a learning platform built around how students actually fail: shallow recall, cramming the wrong things, and not knowing *why* an answer was wrong. Upload your slides or notes — Axom maps the concepts, ranks what’s likely to be tested, runs adaptive practice, and schedules spaced repetition. Wrong answers get a micro-lesson, not just a red X.

Works out of the box with a built-in heuristic engine (no API key). Add OpenAI when you want deeper reasoning.

## Run it

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed    # optional demo course
pnpm dev        # http://localhost:3000
```

**Demo:** `demo@axom.app` / `Demo1234`

Copy `.env.example` → `.env` and set `AUTH_SECRET` before production. Optional LLM vars are documented there.

## What you get

- **Document intelligence** — PDF, txt, md → concepts, knowledge graph, flashcards
- **Tests** — MCQ, short/long answer, cloze, true/false, code, case-based; timed mode; analytics
- **Spaced repetition** — SM-2 scheduler, due-card review queue
- **Notes** — Cornell, exam-focused, ELI5, mind-map, formal, analogy
- **Study plan** — day-by-day schedule to your exam date
- **Resources** — search Reddit, Stack Overflow, HN, Wikipedia, and arXiv from any concept

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Prisma (SQLite dev, Postgres-ready) · Motion · Zod

## Structure

`app/` pages and API routes · `components/` UI · `lib/services/` business logic · `lib/repositories/` data access · `lib/ai/` heuristic + optional OpenAI · `lib/learning/` SM-2

Auth uses httpOnly sessions, CSRF on mutations, bcrypt, rate limits, and ownership-scoped queries.

## Scripts

| Command | |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript |
| `pnpm db:seed` | Demo data |
| `pnpm db:studio` | Prisma Studio |

---

Built by a student who got tired of tools that quiz you and move on.
