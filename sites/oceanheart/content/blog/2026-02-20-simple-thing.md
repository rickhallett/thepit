+++
title = "the simple thing is the right thing"
author = "Richard Hallett"
date = "2026-02-20"
description = "I asked my agent how to trigger a daily Vercel rebuild. It gave me deploy hooks, environment variables, logging scripts. I asked why. It had no good answer."
categories = ["Engineering", "AI"]
tags = ["agents", "simplicity", "over-engineering", "cron"]
draft = false
+++

I needed a cron job to rebuild my Vercel site daily. Scheduled publishing - posts with a future `publishDate` become visible when their date passes.

I asked the agent how to set this up.

## What it gave me

First, it created a bash script:

```bash
#!/bin/bash
# Daily Vercel rebuild for scheduled publishing
#
# Setup:
# 1. Create deploy hook at https://vercel.com/rick-halletts-projects/oceanheart-ui/settings/git
# 2. Set VERCEL_DEPLOY_HOOK env var or edit this script
# 3. Add to crontab: 0 6 * * * /path/to/daily-rebuild.sh

HOOK_URL="${VERCEL_DEPLOY_HOOK:-}"
LOG_FILE="/tmp/vercel-rebuild.log"

if [ -z "$HOOK_URL" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: VERCEL_DEPLOY_HOOK not set" >> "$LOG_FILE"
  exit 1
fi

response=$(curl -s -X POST "$HOOK_URL" -w "%{http_code}" -o /tmp/vercel-response.json)

if [ "$response" = "200" ] || [ "$response" = "201" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') OK: Rebuild triggered (HTTP $response)" >> "$LOG_FILE"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') FAIL: HTTP $response" >> "$LOG_FILE"
  cat /tmp/vercel-response.json >> "$LOG_FILE"
fi
```

Then multi-step setup instructions:

```bash
# 1. Create deploy hook in Vercel dashboard (Settings → Git → Deploy Hooks)

# 2. Add to your shell profile (~/.bashrc or ~/.zshrc):
export VERCEL_DEPLOY_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx"

# 3. Add cron job:
crontab -e

# Add this line (6am daily):
0 6 * * * VERCEL_DEPLOY_HOOK="https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK" /home/mrkai/code/oAI/oceanheart-ui/www.oceanheart.ai/scripts/daily-rebuild.sh
```

## What I asked

> why these choices, over a simple 'at time, exec vercel --prod in this dir'

## What it said

> Honestly? No good reason. I reached for the "proper" solution when the simple one works fine.

```bash
# Just this in crontab:
0 6 * * * cd /home/mrkai/code/oAI/oceanheart-ui/www.oceanheart.ai && vercel --prod --yes >> /tmp/vercel-rebuild.log 2>&1
```

> The deploy hook approach is useful when:
> - You want to trigger from multiple places (GitHub Actions, other services)
> - The machine might not have Vercel CLI
> - Auth tokens might expire
>
> But you're already logged in, CLI works, machine is on. The simple thing is the right thing.

## The pattern

Agents optimise for looking thorough. Environment variables, error handling, HTTP response codes, separate script files. It looks professional. It looks like the kind of thing you'd find in a tutorial.

But I already have `vercel` installed. I'm already authenticated. The machine is on. One line in crontab does the job.

The agent didn't ask what I already had. It assumed a greenfield setup and built accordingly.

When I pushed back, it immediately agreed. No defensiveness. "Honestly? No good reason."

That's the tell. If the agent can't defend the complexity when questioned, the complexity wasn't necessary. The simple thing was available the whole time.
