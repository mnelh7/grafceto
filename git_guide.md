# Git Guide — GRAFCET Live Generator

A personal reference for keeping this repo clean. Read top to bottom once, then use as a lookup.

---

## The three states you need to understand

```
Working directory  →  Staging area  →  Local repo  →  Remote (GitHub)
   (edited files)      (git add)        (git commit)    (git push)
```

Changes flow left to right. Nothing reaches GitHub until you push.

---

## Daily workflow (solo, one branch)

### 1. Before you start working — always pull first

```bash
git pull
```

Keeps your local copy in sync. Do this every time you sit down to work.

---

### 2. Check what's changed

```bash
git status
```

Shows:
- Red = changed but not staged
- Green = staged, ready to commit
- Untracked = new files Git doesn't know about yet

For a detailed diff of what actually changed in the files:

```bash
git diff
```

---

### 3. Stage your changes

Stage specific files (preferred — you know exactly what's going in):

```bash
git add src/components/EditorPanel.tsx
git add src/lib/parser.ts
```

Stage everything changed (use when you're confident everything is intentional):

```bash
git add .
```

Never do `git add .` if there are `.env` files or secrets nearby.

---

### 4. Commit

```bash
git commit -m "Short description of what changed and why"
```

Good commit messages:
- `"Add EditorPanel with line numbers and parse error display"`
- `"Fix: remove unused Layer interface causing TS build error"`
- `"Wip: rough SVG renderer, layout still broken"`

Bad commit messages:
- `"fix"`
- `"changes"`
- `"asdfgh"`

---

### 5. Push to GitHub (triggers Vercel deploy)

```bash
git push
```

---

## Checking your history

See recent commits:

```bash
git log --oneline -10
```

See what changed in the last commit:

```bash
git show
```

---

## Undoing things (safely)

### Undo changes to a file before staging (restore to last commit)

```bash
git restore src/App.tsx
```

⚠️ This deletes your unsaved edits to that file permanently.

---

### Unstage a file (remove from staging, keep your edits)

```bash
git restore --staged src/App.tsx
```

Safe — your changes are still in the file, just removed from the next commit.

---

### Edit the last commit message (before pushing only)

```bash
git commit --amend -m "Corrected commit message"
```

Only safe if you haven't pushed yet.

---

### Undo the last commit entirely (before pushing only)

Keep your file changes, just un-commit:

```bash
git reset --soft HEAD~1
```

Discard your file changes too (dangerous — only if you're sure):

```bash
git reset --hard HEAD~1
```

---

### Revert a commit that's already been pushed

Creates a new commit that undoes the old one — safe for shared history:

```bash
git revert <commit-hash>
git push
```

Get the hash from `git log --oneline`.

---

## If you pull and get a merge conflict

Git will tell you which files conflict. Open them — you'll see markers like:

```
<<<<<<< HEAD
your local version
=======
the remote version
>>>>>>> origin/main
```

Edit the file to keep what you want, delete the markers, then:

```bash
git add <conflicted-file>
git commit -m "Resolve merge conflict in <file>"
git push
```

---

## Branching (when you want to experiment safely)

Create a branch and switch to it:

```bash
git checkout -b feature/svg-renderer
```

Work and commit normally on this branch. When done, merge into main:

```bash
git checkout main
git pull
git merge feature/svg-renderer
git push
```

Delete the branch after merging:

```bash
git branch -d feature/svg-renderer
```

---

## Clean up before committing

Check for anything that shouldn't be committed:

```bash
git status
```

Things that should never be committed:
- `node_modules/` — already in `.gitignore`, but double-check
- `.env` or any file with API keys
- `dist/` — Vercel builds this itself

If something slipped in, add it to `.gitignore`:

```bash
echo "unwanted-file.txt" >> .gitignore
git rm --cached unwanted-file.txt   # removes it from git tracking without deleting the file
git add .gitignore
git commit -m "Remove unwanted-file from tracking"
```

---

## Quick reference card

| What you want to do | Command |
|---|---|
| Pull latest from GitHub | `git pull` |
| See what's changed | `git status` |
| Stage a specific file | `git add <file>` |
| Stage everything | `git add .` |
| Commit | `git commit -m "message"` |
| Push to GitHub | `git push` |
| See recent history | `git log --oneline -10` |
| Unstage a file (keep edits) | `git restore --staged <file>` |
| Discard edits to a file | `git restore <file>` |
| Undo last commit (keep edits) | `git reset --soft HEAD~1` |
| Undo pushed commit safely | `git revert <hash>` then push |
| Create a branch | `git checkout -b branch-name` |
| Switch branches | `git checkout branch-name` |
| Merge branch into main | `git checkout main` → `git merge branch-name` |

---

## The safe daily sequence

```bash
git pull                        # 1. sync first
# ... do your work ...
git status                      # 2. review what changed
git add src/path/to/file.tsx    # 3. stage intentionally
git commit -m "clear message"   # 4. commit
git push                        # 5. push → Vercel deploys
```
