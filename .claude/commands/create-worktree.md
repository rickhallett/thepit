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

<principles>
  <principle>Every branch starts from master. No branch-from-branch. This ensures the simplest possible merge strategy and avoids cascading conflicts.</principle>
  <principle>One issue = one branch = one PR. Never mix issues in a single branch. If two issues overlap, implement them sequentially and rebase the second after merging the first.</principle>
  <principle>Worktree isolation protects master. The worktree is a separate checkout. You can freely switch branches, rebase, and force-push without affecting the main working tree.</principle>
  <principle>Copy hidden files. Gitignored files (.env, .env.local, .vercel/, etc.) must be copied into the worktree — they will not exist otherwise. Use cp, not ln -s: symlinks break Vercel CLI deploys, leak into git status, and can be accidentally committed.</principle>
  <principle>Install deps once. Run pnpm install --frozen-lockfile once after creating the worktree. Only re-run if package.json changes between branches.</principle>
  <principle>Clean up when done. Remove the worktree with git worktree remove after all PRs are merged.</principle>
</principles>

<process>
  <phase name="Parse Arguments and Fetch Issue Details" number="1">
    <description>
      Parse $ARGUMENTS to determine:
      - Issue identifiers (e.g., OCE-36, OCE-37) — fetch from Linear API
      - Issue range (e.g., OCE-36..OCE-47) — expand to individual identifiers, fetch all
      - Plain name (e.g., security) — use as worktree name, no Linear lookup
    </description>

    <steps>
      <step>If issue identifiers are provided, fetch each from Linear using pitlinear CLI or the Linear GraphQL API directly</step>
      <step>For each issue, record: identifier, title, priority (for merge ordering), and labels (for branch prefix convention)</step>
      <step>Derive the worktree name from the issue range or explicit name</step>
    </steps>

    <commands>
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
    </commands>
  </phase>

  <phase name="Create the Worktree" number="2">
    <commands>
```bash
# Ensure master is up to date
git checkout master
git pull origin master

# Create worktree — always from master HEAD
WORKTREE_NAME="<name>"
WORKTREE_PATH="/home/mrkai/code/tspit-worktrees/$WORKTREE_NAME"

git worktree add "$WORKTREE_PATH" master
```
    </commands>
  </phase>

  <phase name="Copy Hidden Files" number="3">
    <description>Gitignored files do not exist in worktrees. Copy them from the main repo. Do NOT symlink — symlinks break Vercel CLI, show as untracked in git status, and can be accidentally committed.</description>
    <commands>
```bash
MAIN_REPO="/home/mrkai/code/tspit"

# Required env files (flat copy)
for f in .env .env.local .env.test .env.sentry-build-plugin; do
  [ -f "$MAIN_REPO/$f" ] && cp "$MAIN_REPO/$f" "$WORKTREE_PATH/$f"
done

# Required directories (recursive copy)
for d in .vercel .vscode; do
  [ -d "$MAIN_REPO/$d" ] && cp -r "$MAIN_REPO/$d" "$WORKTREE_PATH/$d"
done

# Other gitignored dotfiles/dirs
for item in .gemini .ruff_cache .security-audit; do
  [ -e "$MAIN_REPO/$item" ] && cp -r "$MAIN_REPO/$item" "$WORKTREE_PATH/$item"
done
```

```bash
# Verify copies exist (should show regular files, NOT symlinks)
ls -la "$WORKTREE_PATH"/.env* "$WORKTREE_PATH"/.vercel 2>/dev/null
```
    </commands>
  </phase>

  <phase name="Install Dependencies" number="4">
    <commands>
```bash
cd "$WORKTREE_PATH"
pnpm install --frozen-lockfile
```
    </commands>
  </phase>

  <phase name="Create Branches" number="5">
    <description>For each issue, create a branch at master HEAD. Do NOT check them out yet.</description>
    <commands>
```bash
# Branch naming convention: <prefix>/<issue-slug>
# Prefix derived from context: qm/ for quartermaster, feat/ for features, fix/ for bugs, etc.

# Example for OCE-36:
git branch "qm/oce-36-go-gates-ci" master
```
    </commands>
    <rules>
      <rule>Lowercase, hyphen-separated</rule>
      <rule>Include the issue number for traceability</rule>
      <rule>Keep under 50 chars</rule>
      <rule>Prefix matches the conventional commit type (feat/, fix/, ci/, chore/, docs/)</rule>
    </rules>
  </phase>

  <phase name="Implementation Loop" number="6">
    <description>For each issue, ordered by priority then by conflict risk (shared files last).</description>
    <steps>
      <step>Switch to the issue's branch in the worktree</step>
      <step>Implement the changes</step>
      <step>Run the gate: pnpm run lint, pnpm run typecheck, pnpm run test:unit</step>
      <step>Commit with conventional commit message including "Closes ISSUE-ID"</step>
      <step>Push with -u flag: git push -u origin branch-name</step>
      <step>Create PR with gh pr create</step>
      <step>Switch back to master before starting the next issue</step>
    </steps>
    <critical>Always return to master before starting the next issue's branch. This ensures every branch diverges from master, not from another issue branch.</critical>
  </phase>

  <phase name="Merge Strategy" number="7">
    <description>After all PRs are created, determine the optimal merge order.</description>
    <rules>
      <rule>Independent PRs first — PRs that touch unique files with no overlap</rule>
      <rule>Shared-file PRs in dependency order — if multiple PRs touch the same file (e.g., ci.yml, package.json, .gitignore), merge the foundational one first</rule>
      <rule>Rebase before merge — if earlier merges changed files that a later PR also touches, rebase the later branch onto updated master then force push with --force-with-lease</rule>
      <rule>Use admin merge if branch protection blocks merging after rebase: gh pr merge NUMBER --repo rickhallett/thepit --squash --admin</rule>
    </rules>
  </phase>

  <phase name="Cleanup" number="8">
    <steps>
      <step>Switch main repo to master and pull latest</step>
      <step>Remove worktree: git worktree remove PATH (use --force if needed)</step>
      <step>Delete local branches: git branch -D branch1 branch2 ...</step>
      <step>Prune stale remote tracking refs: git remote prune origin</step>
      <step>Update Linear issues to Done (use pitlinear CLI or Linear API)</step>
    </steps>
  </phase>
</process>

<conflict-resolution>
  <scenario name="Same file, different sections">
    Git usually handles this automatically during rebase. Verify the result.
  </scenario>
  <scenario name="Same file, overlapping sections (e.g., adding jobs to ci.yml)">
    Manually resolve by keeping both additions. When you see both hunks adding content to the same location, include all additions in the resolved file.
  </scenario>
  <scenario name="package.json script conflicts">
    Usually caused by multiple PRs adding scripts. Keep all additions. Verify no duplicate keys.
  </scenario>
  <scenario name=".gitignore conflicts">
    Usually caused by multiple PRs adding entries. Keep all entries. Order does not matter.
  </scenario>
</conflict-resolution>

<edge-cases>
  <case trigger="Worktree branch is checked out in main repo">Detach the worktree HEAD first: git -C WORKTREE_PATH checkout --detach</case>
  <case trigger="Go is not available">Use Linear API directly via curl instead of pitlinear CLI</case>
  <case trigger="PR squash merge includes commits from wrong branch">This happens if branches are not properly isolated. Always verify git log --oneline branch ^master shows only the intended commits.</case>
  <case trigger="Base branch modified race condition on merge">Retry the gh pr merge command — GitHub API is eventually consistent.</case>
  <case trigger="Branch protection blocks direct push to master">Always create PRs, even for single-line doc changes.</case>
</edge-cases>

<constraints>
  <constraint>Never create branches from other issue branches — always branch from master</constraint>
  <constraint>Never mix multiple issues in one commit or one branch</constraint>
  <constraint>Never leave the worktree around after all PRs are merged</constraint>
  <constraint>Never force-push without --force-with-lease (safety against overwriting others' work)</constraint>
  <constraint>Never skip the gate before pushing — broken PRs waste CI minutes and block review</constraint>
  <constraint>Never use git rebase -i (interactive rebase requires terminal input, not supported)</constraint>
  <constraint>Never commit .env files or secrets into the worktree branches</constraint>
</constraints>
