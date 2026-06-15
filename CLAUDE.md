# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server with HMR
npm run build     # tsc -b && vite build (type-check + bundle)
npm run lint      # ESLint
npm run preview   # serve the built output locally
```

No test framework is set up. Verify changes by running the dev server and testing in a browser.

## Project overview

**GRAFCET Live Generator** — a client-side-only tool that parses a custom DSL and renders interactive GRAFCET (IEC 60848 Sequential Function Chart) diagrams as SVG.

Constraints (from `todo.md`):
- Client-side only — no backend, no server-side rendering
- SVG rendering only (no `<canvas>` for the diagram)
- No heavyweight dependencies
- Must run with `npm install && npm run dev`

## Architecture

Data flows: DSL text → `parser.ts` → `GrafcetModel` → `layout.ts` → `LayoutResult` → SVG renderer (`GrafcetRenderer.tsx`, built in M3).

### Core library (`src/lib/`)

**`parser.ts`** — converts raw DSL source into a typed `GrafcetModel`. The parser handles three syntax forms:
- **Verbose**: `step S0 "Label" { action "..." }` / `transition T1 from S0 to S1 when "cond"`
- **Compact**: `S0: "Label" / "Action"` / `T1: S0 -> S1 when "cond"`
- **Bare transition**: `S0 -> S1 when "cond"` (auto-generates T-ids)

Key types exported: `GrafcetStep`, `GrafcetTransition`, `GrafcetModel`, `ParseError`, `ParseResult`.

**`layout.ts`** — deterministic top-to-bottom layout engine. BFS from initial steps assigns row numbers; column assignment resolves parallel branches. Outputs `LayoutResult` with pixel-coordinate `LayoutStep[]` and `LayoutTransition[]` plus computed `svgWidth`/`svgHeight`. Layout constants (`STEP_W`, `STEP_H`, `ROW_GAP`, `COL_GAP`, etc.) are exported and used by the renderer.

### App shell (`src/App.tsx`)

- `parse(code)` runs inside `useMemo` on every keystroke
- `lastValidModel` is kept in state so the preview stays visible (faded) while there are parse errors
- `AppConfig` (show grid, show actions, spacing, label position) lives here and is passed down as props
- The preview renders the live diagram via `PreviewCanvas` (pan/zoom) wrapping `GrafcetRenderer` (SVG) — both built in M3

### Editor panel (`src/components/EditorPanel.tsx`)

Three tabs — **Code** (controlled textarea with line numbers + scroll sync), **Config** (toggles and radio groups that write back to `AppConfig`), **Examples** (clickable list). Tab key inside the editor inserts 2 spaces.

### Examples (`src/examples.ts`)

Three built-in examples (`EXAMPLES` array): Electric Hand Dryer (verbose syntax), Conveyor Belt (compact syntax), Two Hand Control (compact + parallel branches). `DEFAULT_EXAMPLE` is the hand dryer.

## Development milestones

`todo.md` tracks high-level milestones. Completed: M1 (parser + layout), M2 (app shell + editor), M3 (`GrafcetRenderer.tsx` SVG rendering + `PreviewCanvas.tsx` pan/zoom). Upcoming:
- **M4** — `Palette.tsx` + help card (pan/zoom canvas itself is already in via M3)
- **M5** — Export SVG/PNG, copy code, docs panel (spec'd: `docs/specs/0001-header-actions-export-docs.md`)
- **M6** — Config tab completion, syntax highlighting
- **M7** — Accessibility, edge-case hardening, final build

## Workflow (idea → exec)

This repo uses a lightweight, native-Claude-Code workflow. **Read `docs/workflow/README.md`** for
the full guide. In short:

- **Specs** live in `docs/specs/` (structured PRD + tasks). Copy `_TEMPLATE.md` or run `/spec <idea>`.
  `todo.md` stays the coarse milestone map; specs are the zoomed-in contracts for active work.
- **`/spec <idea>`** scaffolds a new numbered spec.
- **Plan mode** (Shift+Tab) for any non-trivial task before editing; the `Explore` / `Plan` agents
  help with recon and planning.
- **`grafcet-reviewer`** subagent reviews diffs against this project's constraints before a PR.
- **One spec at a time, one task per commit.** When you ship, reconcile the spec status, `todo.md`,
  and this file (`CLAUDE.md`) in the same change — stale memory misleads every future session.

## DSL syntax reference

```
grafcet "Title" {
  initial step S0 "Label" {
    action "Action text"
  }
  transition T1 from S0 to S1 when "condition"

  // Compact form:
  S1: "Label" / "Action1" / "Action2"
  T2: S1 -> [S2, S3] when "parallel split"

  // Bare form (auto T-id):
  [S2, S3] -> S4 when "join"
}
```

Comments use `//`. Step IDs must be unique. Transition `from`/`to` can be a single ID or a bracketed list `[S1, S2]`.
