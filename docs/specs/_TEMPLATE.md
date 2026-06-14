# Spec NNNN — <Short title>

<!--
HOW TO USE THIS TEMPLATE
- Copy it to docs/specs/NNNN-kebab-title.md (or run `/spec <idea>` to scaffold one).
- Fill the sections top-to-bottom. If a section is genuinely N/A, write "N/A — <why>"
  rather than deleting it, so reviewers know it was considered.
- A spec is "ready to build" when Goal, Tasks, and Acceptance criteria are filled and
  there are no open questions blocking work. Set Status accordingly.
- Keep it short. A spec is a contract, not an essay. If a task needs a paragraph,
  it's probably two tasks.
-->

| Field      | Value                                              |
| ---------- | -------------------------------------------------- |
| **ID**     | NNNN                                               |
| **Status** | draft / ready / in-progress / done / parked        |
| **Milestone** | M? (link to `todo.md`)                          |
| **Created**   | YYYY-MM-DD                                       |
| **Branch / PR** | <branch name> / <PR link once opened>          |

## 1. Problem — why are we doing this?

<!-- 2–4 sentences. What's broken or missing today, from the user's POV. No solution yet. -->

## 2. Goal & non-goals

**Goal:** <one sentence describing the end state.>

**Non-goals (explicitly out of scope):**

- <thing we are deliberately NOT doing in this spec>
- <another, to stop scope creep>

## 3. Approach / design

<!--
The shape of the solution. Name the files/components you expect to touch and how data
flows. Reference the architecture in CLAUDE.md. This is where you make the irreversible
decisions visible BEFORE writing code — the whole point of a spec.
-->

- **Files / surfaces touched:** `src/...`, `...`
- **Data flow / key decisions:** <...>
- **Dependencies:** none new (project constraint: no heavyweight deps) / <justify any>

## 4. Tasks

<!--
The build, decomposed. Each task is a small, verifiable unit — ideally one commit.
Give each an acceptance check so "done" is unambiguous. This is what an agent (or you)
picks up one at a time.
-->

- [ ] **T1 — <task>** — _Done when:_ <observable check>
- [ ] **T2 — <task>** — _Done when:_ <observable check>
- [ ] **T3 — <task>** — _Done when:_ <observable check>

## 5. Acceptance criteria (the whole spec is done when…)

<!-- Higher level than per-task checks. The demo you'd give to prove it works. -->

- [ ] <user-visible outcome 1>
- [ ] <user-visible outcome 2>
- [ ] `npm run build` passes; `npm run lint` clean; no console errors on all built-in examples.

## 6. Verification

<!-- Exact steps a reviewer runs to confirm. There's no test framework yet, so be concrete. -->

1. `npm run dev`, then <do X> → expect <Y>.
2. <...>

## 7. Risks & open questions

- ❓ <question that must be answered before/while building>
- ⚠️ <risk + mitigation>

## 8. Changelog

<!-- Append as work lands. Keeps the spec honest about what actually shipped vs planned. -->

- YYYY-MM-DD — spec created.
