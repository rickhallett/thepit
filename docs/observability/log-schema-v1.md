# Log Schema v1

This schema is the contract for platform-wide structured logs.

## Resource Attributes
- `service.name`: `tspit`
- `service.version`: git SHA or `local`
- `deployment.environment`: `production` | `preview` | `development`

## Core Log Attributes
- `event`: dotted event name (for example `request.completed`, `bout.completed`)
- `requestId`: middleware correlation id
- `traceId`: Sentry/OTel trace id
- `userId`: Clerk user id when authenticated
- `copyVariant`: active copy test variant
- `sessionId`: PostHog session id
- `path`: request path
- `method`: HTTP method
- `status`: request status code or `success`/`failed`
- `durationMs`: request or operation latency in milliseconds
- `signal`: semantic channel (`audit`, `metric`, `security`, `experiment`)
- `sampled`: boolean sampling decision
- `sample_rate`: applied sampling rate

## Event Naming
- Use dotted names for wide events (`webhook.processed`, `credit.settled`, `action.completed`)
- Emit one completion log per request/action at `info`/`warn`/`error`
- Keep per-turn or per-step diagnostics at `debug`

## Security Rules
- Never log request/response bodies
- Never log secrets (keys, bearer tokens, passwords)
- Avoid raw PII (emails, IP addresses)

## Sampling Rules
- `ERROR` and `WARN`: 100%
- `/api/pv` at `INFO`: 10%
- `/api/health` at `INFO`: 0%
- everything else at `INFO`: 100%
