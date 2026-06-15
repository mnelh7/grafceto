---
description: Scaffold a new structured spec in docs/specs from the template
argument-hint: <short description of the feature/idea>
allowed-tools: Read, Write, Bash(ls:*), Bash(git status:*)
---

You are turning a rough idea into a ready-to-build spec.

The idea: **$ARGUMENTS**

Do this:

1. Read the spec template at `docs/specs/_TEMPLATE.md`.
2. Determine the next spec number: list `docs/specs/`, find the highest existing `NNNN-*.md`
   (ignore `_TEMPLATE.md`), and use highest + 1, zero-padded to 4 digits. If none exist, use `0001`.
3. Create `docs/specs/NNNN-<kebab-title>.md` from the template, where `<kebab-title>` is a short
   slug derived from the idea.
4. Fill in everything you can confidently infer from the idea and from the codebase
   (`CLAUDE.md` for architecture/constraints, `todo.md` for the relevant milestone):
   - the metadata table (ID, Status = `draft`, Milestone if obvious, Created = today's date),
   - Problem, Goal & non-goals, and a first pass at Approach and Tasks.
   - Each task MUST have a concrete "Done when:" check.
5. For anything you genuinely cannot infer, leave the template's placeholder text in place and
   collect those gaps into a short list.

Then STOP and report:
- the path of the spec you created,
- a 2–3 line summary of what you filled in,
- the list of open questions / gaps the user needs to resolve before the spec is `ready`.

Do not start implementing. This command only produces the spec. Once the spec is `ready`, the
user will plan and build it (see `docs/workflow/README.md`).
