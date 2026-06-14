# Spec 0001 — Header actions: Export SVG/PNG, Copy code, Docs panel

| Field           | Value                                   |
| --------------- | --------------------------------------- |
| **ID**          | 0001                                    |
| **Status**      | ready                                   |
| **Milestone**   | M5 (see `todo.md`)                      |
| **Created**     | 2026-06-14                              |
| **Branch / PR** | `feat/m5-header-actions` / _TBD_        |

## 1. Problem — why are we doing this?

A user can build a GRAFCET diagram in the live editor but can't get it _out_ of the app:
there's no way to export the rendered diagram, copy the DSL source, or look up the syntax
without leaving the tool. The diagram is render-only and the syntax is undocumented in-app,
which blocks any real use (sharing a diagram, pasting it into a report, learning the DSL).

## 2. Goal & non-goals

**Goal:** From the header, the user can export the current diagram as SVG or PNG, copy the
DSL code to the clipboard, and open an in-app docs panel covering the DSL syntax.

**Non-goals (explicitly out of scope):**

- Importing/opening external files (load is only via built-in Examples for now).
- PDF export or print stylesheets.
- Editing/saving diagrams to a backend (the app is client-side only — hard constraint).
- Server-side rendering of exports.

## 3. Approach / design

- **Files / surfaces touched:**
  - `src/components/Toolbar.tsx` (new) — export/copy buttons + handlers, or inline in `App.tsx` if lighter.
  - `src/components/DocsPanel.tsx` (new) — modal/slide-over with copyable syntax sections.
  - `src/App.tsx` — wire header buttons, hold the SVG element ref, manage docs-open state.
- **Data flow / key decisions:**
  - Export SVG = serialize the live `<svg>` node (`XMLSerializer`) → `Blob` → download. No new lib.
  - Export PNG = draw the serialized SVG into an offscreen `<canvas>` → `toBlob` → download.
    Note: `<canvas>` is allowed for _export_; the diagram itself stays SVG (the no-canvas rule
    is about how the diagram is _rendered_, not how it's exported).
  - Copy code = Clipboard API with a `document.execCommand('copy')` fallback; brief inline "Copied!".
  - Buttons disabled when there is no valid diagram (`model == null`).
- **Dependencies:** none new — uses `XMLSerializer`, `<canvas>`, Clipboard API (all native).

## 4. Tasks

- [ ] **T1 — Export SVG** — _Done when:_ clicking "Export SVG" downloads a `.svg` that opens
      standalone in a browser and visually matches the on-screen diagram.
- [ ] **T2 — Export PNG** — _Done when:_ clicking "Export PNG" downloads a `.png` containing the
      diagram only (no UI chrome), at the diagram's natural size.
- [ ] **T3 — Copy code** — _Done when:_ clicking "Copy code" puts the editor's DSL on the clipboard
      and shows a transient "Copied!" confirmation.
- [ ] **T4 — Disable when empty** — _Done when:_ all three actions are disabled while there is no
      valid parsed diagram.
- [ ] **T5 — Docs panel** — _Done when:_ a "Docs" button opens a modal with sections (Overview,
      Grafcet block, Verbose/Compact/Initial steps, Actions, Transitions, Branches & Joins), each
      with a copyable example; Escape and a close button dismiss it without resetting editor state.
- [ ] **T6 — Keyboard shortcuts** — _Done when:_ `Ctrl/Cmd+S` exports SVG (and suppresses the
      browser save dialog); shortcut is documented in the docs panel.

## 5. Acceptance criteria (the whole spec is done when…)

- [ ] SVG and PNG of the hand-dryer example download and open correctly.
- [ ] Copy code round-trips: pasted text re-parses into the same diagram.
- [ ] Docs panel opens/closes cleanly and never unmounts the editor or loses code.
- [ ] Export buttons are disabled on parse error / empty editor.
- [ ] `npm run build` passes; `npm run lint` clean; no console errors on all three built-in examples.

## 6. Verification

1. `npm run dev`. Load "Electric Hand Dryer".
2. Click **Export SVG** → open the file in a new tab → matches on-screen diagram. ✅
3. Click **Export PNG** → file shows the diagram only, no toolbar/grid. ✅
4. Clear the editor → all three buttons disabled, preview shows empty state. ✅
5. Type valid code → click **Copy code** → paste into editor → re-parses identically; "Copied!" flashed. ✅
6. Click **Docs** → tab through sections, copy an example, press **Esc** → closes, editor code unchanged. ✅
7. Press **Cmd/Ctrl+S** → SVG downloads, no browser save dialog. ✅

## 7. Risks & open questions

- ⚠️ PNG export of an SVG with external/embedded fonts can render with fallback fonts on the
  canvas. _Mitigation:_ inline the computed font-family into the serialized SVG before drawing.
- ⚠️ Tainted-canvas errors if the SVG references external images. _Mitigation:_ the diagram is
  pure vector + text, so no external `<image>` hrefs — verify this stays true.
- ❓ Should "Copy code" copy the raw editor text or a normalized/formatted version? _Default:_ raw
  editor text (least surprising).

## 8. Changelog

- 2026-06-14 — spec created (worked example for the new workflow; promoted from `todo.md` M5).
