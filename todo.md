# GRAFCET Live Generator — TODO

## Rules
- Client-side only: React + TypeScript + Vite + Tailwind CSS
- SVG rendering, no canvas
- No backend, no heavyweight deps
- Clean TypeScript types throughout
- No placeholder TODOs in final code
- Must run with `npm install && npm run dev`

---

## M1 — Project setup + core lib ✅ DONE

- [x] Vite + React + TypeScript scaffolded
- [x] Tailwind CSS v4 installed and wired into vite.config.ts
- [x] `src/lib/parser.ts` — full DSL parser (verbose, compact, branch syntax)
- [x] `src/lib/layout.ts` — deterministic top-to-bottom layout engine
- [x] `src/index.css` — base styles + dotted-grid utility

**Verify:** `npm install` succeeds, no TS errors in parser/layout.

---

## M2 — App shell + editor + examples + parse integration

### App shell (`App.tsx`, `main.tsx`)
- [ ] Top header with: logo, "GRAFCET Live Generator", Docs / Load example / Export SVG / Export PNG / Copy code buttons, `v0.1.0` badge
- [ ] Desktop: 38% left editor / 62% right preview split
- [ ] Mobile/tablet: editor stacked above preview
- [ ] Parse code with `useMemo` on every change
- [ ] Pass `ParseResult` down to editor (errors) and preview (model)
- [ ] On parse failure keep last valid model faintly visible

### Examples (`src/examples.ts`)
- [ ] Three entries: Electric Hand Dryer, Conveyor, Two Hand Control
- [ ] Each: `id`, `title`, `description`, `code`
- [ ] Load Electric Hand Dryer by default on first render

### Editor panel (`src/components/EditorPanel.tsx`)
- [ ] Tabs: Code | Config | Examples
- [ ] Code tab: controlled textarea, monospace font, line numbers, live updates
- [ ] Parse status bar below editor: "Parsed successfully" or "3 errors"
- [ ] Error list: line number + message for each parse error
- [ ] Examples tab: clickable list of built-in examples
- [ ] Config tab: stub (filled in M6)

**Verify:** Typing updates preview live. Errors show with line numbers. Switching examples replaces editor content.

---

## M3 — SVG GRAFCET renderer

### `src/components/GrafcetRenderer.tsx`
- [ ] Accept `GrafcetModel` + `LayoutResult` as props
- [ ] Render title above diagram
- [ ] Steps: square boxes, ID number inside, label below box
- [ ] Initial steps: double-bordered square (inner + outer rect)
- [ ] Actions: rectangles to the right of their step, connected with a horizontal line
- [ ] Transitions: short thick horizontal bar crossing the vertical flow line
- [ ] Transition condition: text to the right of the bar
- [ ] Connector lines: straight vertical segments between steps and transitions
- [ ] Branch bar: horizontal line spanning all target columns (multi-target transition)
- [ ] Join bar: horizontal line spanning all source columns (multi-source transition)
- [ ] Loop-back connectors: route left or right of the main column to avoid overlap
- [ ] Black/dark-gray outlines, subtle blue accent on initial step border
- [ ] All text clipped/truncated gracefully for long labels

**Verify:** All three built-in examples render recognizable GRAFCET diagrams. Initial step has double border. Branch and join bars appear in Two Hand Control.

---

## M4 — Preview canvas + pan/zoom + palette + help card

### `src/components/PreviewCanvas.tsx`
- [ ] Dotted-grid background (CSS)
- [ ] Embed `GrafcetRenderer` SVG centered in the viewport
- [ ] Pan: mouse drag translates the diagram
- [ ] Zoom: scroll wheel scales the diagram
- [ ] Zoom in / Zoom out / Fit view / Reset buttons (floating toolbar, top-center)
- [ ] `Ctrl/Cmd + Enter` keyboard shortcut → fit view
- [ ] Smooth transform via CSS `transform: translate() scale()`

### `src/components/Palette.tsx`
- [ ] Bottom-center strip inside preview area
- [ ] Items: Step, Initial Step, Transition, Action, Jump, AND/OR, Comment
- [ ] Simple inline SVG icons + label text
- [ ] Decorative for MVP (no drag-to-insert); hover states applied

### Help card
- [ ] Small floating blue card (top-left of canvas) shown when an example is loaded
- [ ] Displays example title + description
- [ ] "Hide" button dismisses it; stays hidden until next example is loaded

**Verify:** Grid visible. Pan and zoom work. Fit view centers diagram. Palette visible at bottom. Help card appears on example load and hides on click.

---

## M5 — Header actions (export, copy, docs)

### Export + clipboard (`src/components/Toolbar.tsx` or inline in `App.tsx`)
- [ ] Export SVG: serialize current SVG element, download as `.svg`
- [ ] Export PNG: draw SVG into offscreen `<canvas>`, download as `.png`
- [ ] Copy code: Clipboard API with fallback; show brief inline feedback ("Copied!")
- [ ] `Ctrl/Cmd + S` → export SVG (prevent browser save dialog)
- [ ] Disable export buttons when no valid diagram exists

### Docs panel (`src/components/DocsPanel.tsx`)
- [ ] Modal/slide-over opened by "Docs" button
- [ ] Sections: Overview, Grafcet block, Verbose steps, Compact steps, Initial steps, Actions, Transitions, Branches & Joins
- [ ] Each section has a copyable code example
- [ ] Close by button or Escape key
- [ ] Does not unmount editor or reset state

**Verify:** SVG downloads and opens in browser. PNG contains diagram only. Copy shows feedback. Docs open/close cleanly. Keyboard shortcuts work.

---

## M6 — Config tab + syntax highlighting

### Config tab (complete the stub from M2)
- [ ] Show/hide grid toggle
- [ ] Show/hide action boxes toggle
- [ ] Spacing: Compact / Comfortable radio
- [ ] Step label: Inside box / Below box radio
- [ ] Store in React state, pass as config prop to renderer/canvas

### Syntax highlighting
- [ ] Lightweight approach: overlay `<pre>` with colored spans behind the `<textarea>` (no heavy editor lib)
- [ ] Highlight: `grafcet` `initial` `step` `transition` `from` `to` `when` `action` keywords, step/transition IDs, quoted strings, `//` comments
- [ ] Line numbers stay aligned with highlighted code
- [ ] Editing behavior unaffected

**Verify:** Config toggles visibly change the diagram. Highlighting appears for all built-in examples. Typing remains responsive.

---

## M7 — Accessibility + hardening + final build

### Accessibility
- [ ] `aria-label` on all icon-only buttons
- [ ] Keyboard-focusable toolbar and palette
- [ ] Visible focus rings
- [ ] `aria-live="polite"` on parse status indicator
- [ ] Docs modal traps focus while open

### Edge-case hardening
- [ ] Step with no actions renders without gaps
- [ ] Step with 4+ actions stays readable
- [ ] Long labels truncated or wrapped without breaking layout
- [ ] Multiple initial steps render without crash
- [ ] Loop-back transition does not produce negative coordinates
- [ ] Empty editor shows friendly empty state in preview
- [ ] No uncaught runtime errors in console for any built-in example

### Final build
- [ ] `npm run build` completes with no errors
- [ ] No unused imports or dead code
- [ ] No placeholder TODOs remaining
- [ ] All three examples parse, render, and export correctly

**Verify:** `npm run build` passes. Tab navigation reaches all controls. Console is clean. All header actions work end-to-end.
