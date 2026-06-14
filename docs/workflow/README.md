# The idea → exec workflow (a guided walkthrough)

This doc is both the **map of how we work** in this repo and a **learning guide** to the
Claude Code primitives that make it work. It's written for someone new to Claude Code's
terminal model (you've used plan-mode-style tools before, but not subagents/skills/hooks).

The design goal you set: a **reusable system** built **native-first** (lean on what Claude
Code already gives you, don't import a heavy framework), with a **structured spec → tasks**
core, **a couple of specialized agents**, and **reusable skills/commands**.

---

## TL;DR — the loop

```
idea ──/spec──▶ spec (docs/specs/NNNN-*.md) ──plan mode──▶ approved plan
   ──build (one task at a time)──▶ code ──@grafcet-reviewer──▶ review
   ──commit/PR──▶ merge ──▶ update spec + todo.md
```

Five stages, each owned by a primitive that Claude Code ships natively:

| Stage      | What happens                                  | Primitive that owns it                       |
| ---------- | --------------------------------------------- | -------------------------------------------- |
| **Idea**   | rough thought → captured                      | `/spec` slash command → spec file            |
| **Spec**   | structured PRD + task breakdown, acceptance   | `docs/specs/*.md` (the artifact)             |
| **Plan**   | decide the approach before editing            | **Plan mode** + the `Plan` / `Explore` agents |
| **Build**  | implement one task at a time                  | the main agent (you + Claude), `CLAUDE.md` as memory |
| **Review** | check against constraints & contracts         | `@grafcet-reviewer` subagent, `/code-review` |
| **Ship**   | commit / PR / merge, then reconcile artifacts | git + updating the spec & `todo.md`          |

The rest of this doc explains each primitive — what it is, *why* it exists, and how it
shows up in this repo.

---

## The primitives, explained

### 1. `CLAUDE.md` — project memory (the thing that makes everything else cheap)

`CLAUDE.md` at the repo root is **loaded into Claude's context automatically at the start of
every session**. It's where the architecture, constraints, and commands live so you never
have to re-explain them.

- **Why it matters:** every other primitive (agents, commands) gets better when CLAUDE.md is
  accurate, because they all read it. The opposite is also true — and you just saw it: before
  this pass, CLAUDE.md claimed "M3 not yet built / preview is a placeholder," but
  `GrafcetRenderer.tsx` and `PreviewCanvas.tsx` were already committed. **Stale memory is worse
  than no memory** — it actively misleads. We fixed it in this same change.
- **Rule of thumb:** when "done" changes the architecture or the milestone status, update
  CLAUDE.md in the *same* commit. Treat it as code.

### 2. Specs — the structured artifact (`docs/specs/`)

A spec is a small contract for one unit of work: **Problem → Goal/Non-goals → Approach →
Tasks (with "Done when" checks) → Acceptance → Verification → Risks**.

- **Why a spec and not just a todo line?** Your `todo.md` milestones are coarse ("M5 — export
  + docs"). A spec forces the irreversible decisions into the open *before* code is written
  (e.g. "PNG export is allowed to use `<canvas>` because the no-canvas rule is about
  *rendering*, not *export*" — that one line prevents a wrong rewrite later). It also gives an
  agent a self-contained unit it can pick up without you re-explaining.
- **Files:**
  - `docs/specs/_TEMPLATE.md` — the format (copy it, or run `/spec`).
  - `docs/specs/0001-header-actions-export-docs.md` — a **real worked example** (your M5),
    fully filled in so you can see the format applied to actual work.
- **Lifecycle:** `draft` → `ready` (Goal+Tasks+Acceptance filled, no blocking questions) →
  `in-progress` → `done`. The Status field at the top of each spec tracks this.
- **`todo.md` doesn't go away.** It stays as the high-level milestone map; specs are the
  zoomed-in contracts for the milestone you're actively building.

### 3. Slash commands — reusable procedures you trigger (`.claude/commands/`)

A slash command is a **saved prompt** in `.claude/commands/<name>.md`. Typing `/<name>` runs
it. Frontmatter (`description`, `argument-hint`, `allowed-tools`, `model`) configures it;
`$ARGUMENTS` injects whatever you typed after the command.

- **Why:** anything you'd re-type often becomes a command. It's the lightest-weight way to
  codify "the way we do X." This is the simplest entry point into Claude Code automation —
  start here before reaching for agents or skills.
- **What we shipped:** `/spec <idea>` — reads the template, finds the next spec number, and
  scaffolds `docs/specs/NNNN-*.md` filled in from your idea + the codebase, then reports the
  open questions. Try it: `/spec add a dark mode toggle to the header`.
- **Command vs "Skill":** in Claude Code, a *skill* (`.claude/skills/<name>/SKILL.md`) is a
  beefier cousin — it can bundle scripts and resources and can be invoked by Claude *on its
  own* when relevant, not just when you type it. For a first project, slash commands cover
  ~90% of "reusable procedure" needs; graduate a command into a skill when it grows scripts or
  you want Claude to reach for it automatically. (See "Extending this" below.)

### 4. Plan mode + the planning agents — decide before you edit

**Plan mode** is a built-in state where Claude researches and proposes a plan but is
*blocked from editing files* until you approve. You enter it with **Shift+Tab** (cycles
through permission modes) and approve via the plan prompt. This is the terminal-native
equivalent of the plan mode you know from Codex.

- **Why:** it separates "thinking" from "doing," so you catch a wrong approach when it's a
  paragraph to fix, not a diff to revert. Use it for any task above trivial.
- **Helpers you didn't know you had:** Claude Code ships read-only agents you can delegate to:
  - **`Explore`** — fans out across the codebase to answer "where is X / how is Y wired" without
    dumping whole files into your context. Great before writing a spec or plan.
  - **`Plan`** — an architect agent that returns a step-by-step implementation plan.
  - You don't install these — they're built in. The custom agent we added (`grafcet-reviewer`)
    complements them; it doesn't replace them.

### 5. Subagents — specialized workers with their own context (`.claude/agents/`)

A subagent is defined in `.claude/agents/<name>.md`: frontmatter (`name`, `description`,
`tools`, `model`) + a body that is its **system prompt**. It runs in its **own context window**
with only the tools you grant, and reports a summary back.

- **Why a separate agent instead of just asking?** Two reasons: (1) **isolation** — a noisy job
  (a big review, a wide search) doesn't flood your main conversation; only the conclusion comes
  back. (2) **specialization** — you bake in a role and its rules once, so it's consistent every
  time and can't drift.
- **What we shipped:** `grafcet-reviewer` — a read-only reviewer that knows *this project's*
  non-negotiables (client-side only, SVG-for-diagram, no heavy deps, the parser→layout→renderer
  contract, the cyclic-graph regression) and reviews a diff against them. Invoke it by asking
  Claude to "use the grafcet-reviewer to review my changes," or it may be picked automatically
  because its `description` says when to use it.
- **Reuse insight:** the *structure* of a reviewer agent is 100% portable; only the
  project-specific rules in the body change. That's your reusable system — copy the agent to a
  new repo and swap the constraints.

### 6. Hooks & settings — automation that runs without being asked (`.claude/settings.json`)

Hooks are commands the harness runs automatically on events (e.g. after every file edit, when
a session stops). They live in `settings.json` under `hooks`. `settings.local.json` (already
present here, holding a `Bash(npm run *)` permission) is the same idea for personal, untracked
settings.

- **Why:** to enforce a habit you don't want to rely on memory for — e.g. "type-check after
  every edit," "block commits to main."
- **We did NOT enable a hook** in this pass — surprising auto-running commands on a first
  project causes more confusion than value. Instead, here's a safe opt-in you can paste into
  `.claude/settings.json` when you want it (runs the type-checker after Claude edits a `.ts/.tsx`
  file and surfaces errors):

  ```jsonc
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [
            { "type": "command", "command": "npm run build --silent 2>&1 | tail -n 20 || true" }
          ]
        }
      ]
    }
  }
  ```

  Start without it; add it once the loop feels natural.

---

## The loop, worked end-to-end

Concretely, here's how the next feature should flow — using the M5 spec we already wrote as
the example:

1. **Capture the idea.** `/spec add export, copy-code, and a docs panel to the header`
   → produces a spec file. (We did this by hand for `0001` so you can see a complete one.)
2. **Make it `ready`.** Open `docs/specs/0001-header-actions-export-docs.md`, answer the open
   questions in §7, set Status to `ready`. Optionally use the `Explore` agent first to confirm
   where the header buttons are wired in `App.tsx`.
3. **Plan.** Shift+Tab into plan mode: "Implement task T1 (Export SVG) from spec 0001." Approve
   the plan.
4. **Build one task.** Implement T1 only. Stop at its "Done when" check. Commit:
   `git commit -m "M5: export current diagram as SVG (spec 0001 T1)"`. Tick the box in the spec.
5. **Review.** "Use grafcet-reviewer to review this change." Address blockers.
6. **Repeat** for T2…T6, one task per commit.
7. **Ship.** Open a PR (`feat/m5-header-actions`). When it merges, set the spec Status to
   `done`, tick the M5 boxes in `todo.md`, and update `CLAUDE.md` if the architecture changed.

The discipline that makes it work: **one spec at a time, one task per commit, review against
the constraints, reconcile the artifacts when you ship.**

---

## What was created in this pass (manifest)

| Path                                            | Primitive       | Purpose                                          |
| ----------------------------------------------- | --------------- | ------------------------------------------------ |
| `docs/workflow/README.md`                       | doc             | this guide                                       |
| `docs/specs/_TEMPLATE.md`                       | spec format     | structured PRD + tasks template                  |
| `docs/specs/0001-header-actions-export-docs.md` | spec (example)  | real worked spec for M5                          |
| `.claude/commands/spec.md`                      | slash command   | `/spec` scaffolds a new spec                     |
| `.claude/agents/grafcet-reviewer.md`            | subagent        | project-aware code reviewer                      |
| `CLAUDE.md` (edited)                            | project memory  | added Workflow section; fixed stale M3 status    |

---

## Extending this (so it stays a system, not a one-off)

Add these as the need actually arises — don't build them speculatively:

- **`/plan-task <spec> <task-id>`** — a command that loads a spec + task and drops you into a
  focused implementation plan. (Graduate from `/spec`'s pattern.)
- **`/ship`** — a command that runs build + lint, ticks the spec/todo boxes, and drafts a commit
  message referencing the spec.
- **A `spec-author` agent** — if `/spec` grows past a single prompt (e.g. it should interview
  you, search the codebase, and draft), promote it from a command into a subagent or a Skill.
- **A pre-commit hook** — block commits when `npm run build` fails (the opt-in snippet above is
  the starting point).
- **Built-ins you already have:** `/code-review` (diff review for bugs + cleanups),
  `/security-review`, `/init` (regenerate CLAUDE.md), and the `Explore` / `Plan` agents. Reach
  for these before writing new ones.

### Making it reusable across projects

The portable parts are: the **spec template**, the **`/spec` command**, the **reviewer agent
structure**, and the **CLAUDE.md discipline**. To reuse in a new repo: copy `docs/specs/_TEMPLATE.md`
and `.claude/commands/spec.md` as-is; copy `.claude/agents/grafcet-reviewer.md` and swap the
project-specific constraints for the new project's. That bundle is your starter workflow kit.

---

## Cheat sheet

```
/spec <idea>                         scaffold a new spec in docs/specs/
Shift+Tab                            cycle permission modes → enter plan mode
"use the Explore agent to …"         read-only codebase recon
"use grafcet-reviewer to review …"   project-aware diff review
/code-review                         built-in diff review (bugs + cleanups)
/init                                regenerate CLAUDE.md from the codebase
```

Golden rules: **spec before code · plan before edit · one task per commit · review against the
constraints · reconcile CLAUDE.md + todo.md when you ship.**
