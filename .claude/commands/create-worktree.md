# Create Worktree

Create an isolated git worktree for implementing one or more Linear issues as separate PRs branched off master. Each issue gets its own branch, its own commit, and its own PR — but they all share a single worktree to avoid disk bloat.

## Usage

```
/create-worktree "OCE-36 OCE-37 OCE-38"     # Implement these 3 issues
/create-worktree "OCE-42"                     # Single issue
/create-worktree "OCE-36..OCE-47"             # Range of issues
/create-worktree "security"                   # Use as worktree name (no issues pre-loaded)
```

The argument `$ARGUMENTS` specifies Linear issue identifiers or a worktree name. If issue IDs are provided, fetch their details from Linear to populate branch names and PR descriptions.

## Principles

1. **Every branch starts from master.** No branch-from-branch. This ensures the simplest possible merge strategy and avoids cascading conflicts.
2. **One issue = one branch = one PR.** Never mix issues in a single branch. If two issues overlap, implement them sequentially and rebase the second after merging the first.
3. **Worktree isolation protects master.** The worktree is a separate checkout. You can freely switch branches, rebase, and force-push without affecting the main working tree.
4. **Symlink hidden files.** Gitignored files (`.env`, `.env.local`, `.vercel/`, etc.) must be symlinked into the worktree — they won't exist otherwise.
5. **Install deps once.** Run `pnpm install --frozen-lockfile` once after creating the worktree. Only re-run if `package.json` changes between branches.
6. **Clean up when done.** Remove the worktree with `git worktree remove` after all PRs are merged.

## Process

### Phase 1: Parse Arguments and Fetch Issue Details

Parse `$ARGUMENTS` to determine:
- **Issue identifiers** (e.g., `OCE-36`, `OCE-37`) — fetch from Linear API
- **Issue range** (e.g., `OCE-36..OCE-47`) — expand to individual identifiers, fetch all
- **Plain name** (e.g., `security`) — use as worktree name, no Linear lookup

If issue identifiers are provided, fetch each from Linear:

```bash
# Using pitlinear CLI (if available and Go is working)
pitlinear --json issues get OCE-36

# Or using Linear API directly
source .env.local
curl -s -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{"query":"{ issue(id: \"OCE-36\") { id identifier title description priority state { name } labels { nodes { name } } } }"}'
```

For each issue, record:
- **identifier**: e.g., `OCE-36`
- **title**: e.g., "Add Go Tool Gates to CI Pipeline"
- **priority**: for merge ordering (urgent/high first)
- **labels**: for branch prefix convention

Derive the worktree name from the issue range or explicit name:
- Issues `OCE-36..OCE-47` → worktree name `quartermaster` (or ask user)
- Single issue `OCE-42` → worktree name from issue title slug
- Plain name `security` → use as-is

### Phase 2: Create the Worktree

```bash
# Ensure master is up to date
git checkout master
git pull origin master

# Create worktree — always from master HEAD
WORKTREE_NAME="<name>"
WORKTREE_PATH="/home/mrkai/code/tspit-worktrees/$WORKTREE_NAME"

git worktree add "$WORKTREE_PATH" master
```

### Phase 3: Symlink Hidden Files

Gitignored files don't exist in worktrees. Symlink them from the main repo:

```bash
MAIN_REPO="/home/mrkai/code/tspit"

# Required env files
for f in .env .env.local .env.test .env.sentry-build-plugin; do
  [ -f "$MAIN_REPO/$f" ] && ln -sf "$MAIN_REPO/$f" "$WORKTREE_PATH/$f"
done

# Required directories
for d in .vercel .vscode; do
  [ -d "$MAIN_REPO/$d" ] && ln -sf "$MAIN_REPO/$d" "$WORKTREE_PATH/$d"
done

# Any other gitignored dotfiles/dirs that exist
for item in .gemini .ruff_cache .security-audit; do
  [ -e "$MAIN_REPO/$item" ] && ln -sf "$MAIN_REPO/$item" "$WORKTREE_PATH/$item"
done
```

Verify symlinks are correct:

```bash
ls -la "$WORKTREE_PATH"/.env* "$WORKTREE_PATH"/.vercel 2>/dev/null
```

### Phase 4: Install Dependencies

```bash
cd "$WORKTREE_PATH"
pnpm install --frozen-lockfile
```

### Phase 5: Create Branches

For each issue, create a branch. Do NOT check them out yet — just create them at master HEAD:

```bash
# Branch naming convention: <prefix>/<issue-slug>
# Prefix derived from context: qm/ for quartermaster, feat/ for features, fix/ for bugs, etc.

# Example for OCE-36:
git branch "qm/oce-36-go-gates-ci" master
```

Branch naming rules:
- Lowercase, hyphen-separated
- Include the issue number for traceability
- Keep it under 50 chars
- Prefix matches the conventional commit type (`feat/`, `fix/`, `ci/`, `chore/`, `docs/`)

### Phase 6: Implementation Loop

For each issue (ordered by priority, then by conflict risk — shared files last):

```bash
# 1. Switch to the issue's branch
cd "$WORKTREE_PATH"
git checkout "<branch-name>"

# 2. Implement the changes
# ... (agent-specific work)

# 3. Run the gate
pnpm run lint
pnpm run typecheck
pnpm run test:unit

# 4. Commit
git add -A
git commit -m "<type>: <description>

<body explaining why>

Closes <ISSUE-ID>"

# 5. Push
git push -u origin "<branch-name>"

# 6. Create PR
gh pr create \
  --title "<type>: <description> (<ISSUE-ID>)" \
  --body "$(cat <<'PREOF'
## Summary
- <1-3 bullet points>

Closes <ISSUE-ID>
PREOF
)"

# 7. Switch back to master before starting next issue
git checkout master
```

**Critical:** Always return to master before starting the next issue's branch. This ensures every branch diverges from master, not from another issue branch.

### Phase 7: Merge Strategy

After all PRs are created, determine the optimal merge order:

1. **Independent PRs first** — PRs that touch unique files with no overlap
2. **Shared-file PRs in dependency order** — If multiple PRs touch the same file (e.g., `ci.yml`, `package.json`, `.gitignore`), merge the foundational one first
3. **Rebase before merge** — If earlier merges changed files that a later PR also touches, rebase the later branch:
   ```bash
   git fetch origin master
   git checkout "<branch>"
   git rebase origin/master
   # Resolve conflicts
   git push --force-with-lease origin "<branch>"
   ```
4. **Use admin merge** if branch protection blocks merging (checks haven't run on rebased commit):
   ```bash
   gh pr merge <number> --repo rickhallett/thepit --squash --admin
   ```

### Phase 8: Cleanup

After all PRs are merged:

```bash
# Switch main repo to master
cd /home/mrkai/code/tspit
git checkout master
git pull origin master

# Remove worktree
git worktree remove "$WORKTREE_PATH"
# If modified/untracked files remain:
git worktree remove --force "$WORKTREE_PATH"

# Delete local branches
git branch -D <branch1> <branch2> ...

# Prune stale remote tracking refs
git remote prune origin

# Update Linear issues to Done
# (use pitlinear CLI or Linear API)
```

## Conflict Resolution Playbook

### Same file, different sections
Git usually handles this automatically during rebase. Verify the result.

### Same file, overlapping sections (e.g., adding jobs to ci.yml)
Manually resolve by keeping both additions. The pattern:
```
<<<<<<< HEAD
  job-from-earlier-pr:
    ...
=======
  job-from-this-pr:
    ...
>>>>>>> commit
```
Resolution: Keep both jobs.

### package.json script conflicts
Usually caused by multiple PRs adding scripts. Keep all additions. Verify no duplicate keys.

### .gitignore conflicts
Usually caused by multiple PRs adding entries. Keep all entries. Order doesn't matter.

## Edge Cases

- **Worktree branch is checked out in main repo:** Detach the worktree HEAD first: `git -C "$WORKTREE_PATH" checkout --detach`
- **Go isn't available:** Use Linear API directly via curl instead of pitlinear CLI
- **PR squash merge includes commits from wrong branch:** This happens if branches aren't properly isolated. Always verify `git log --oneline <branch> ^master` shows only the intended commit(s).
- **Base branch modified race condition on merge:** Retry the `gh pr merge` command — GitHub's API is eventually consistent.
- **Branch protection blocks direct push to master:** Always create PRs, even for single-line doc changes.

## Do NOT

- Create branches from other issue branches — always branch from master
- Mix multiple issues in one commit or one branch
- Leave the worktree around after all PRs are merged
- Force-push without `--force-with-lease` (safety against overwriting others' work)
- Skip the gate before pushing — broken PRs waste CI minutes and block review
- Use `git rebase -i` (interactive rebase requires terminal input, not supported)
- Commit `.env` files or secrets into the worktree branches
