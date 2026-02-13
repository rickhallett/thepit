# Pre-Launch Security Checklist

This checklist must be verified before any production deployment.

## Environment Configuration

### Required Variables

- [ ] `DATABASE_URL` - Production Neon connection string with SSL
- [ ] `ANTHROPIC_API_KEY` - Production Anthropic API key
- [ ] `STRIPE_SECRET_KEY` - Live Stripe secret key (not `sk_test_*`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook signing secret
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production Clerk publishable key
- [ ] `CLERK_SECRET_KEY` - Production Clerk secret key
- [ ] `ADMIN_SEED_TOKEN` - Strong token (32+ characters, random)

### Feature Flags (verify settings)

- [ ] `CREDITS_ENABLED=true` - Credit system active
- [ ] `SUBSCRIPTIONS_ENABLED=true` - Subscription system active
- [ ] `PREMIUM_ENABLED=true` - Premium presets active
- [ ] `BYOK_ENABLED=true/false` - Set intentionally
- [ ] `CREDITS_ADMIN_ENABLED=false` - Disable test credit grants in production

### Sensitive Variables (verify NOT in logs/client)

- [ ] No `*_SECRET*` variables exposed to client
- [ ] No database URLs in error messages
- [ ] No API keys in error messages
- [ ] Admin user IDs not guessable

## Database Security

- [ ] Connection uses SSL (`?sslmode=require`)
- [ ] Database not publicly accessible
- [ ] Connection pooling configured
- [ ] Backup encryption enabled
- [ ] No direct IP access (VPC/private networking)

## Stripe Configuration

- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] Webhook secret matches `STRIPE_WEBHOOK_SECRET`
- [ ] Live mode API keys (not test keys)
- [ ] Price IDs are live mode IDs
- [ ] Customer portal configured
- [ ] Subscription products have correct metadata

## Authentication (Clerk)

- [ ] Production instance configured
- [ ] OAuth providers production-ready
- [ ] Session lifetime appropriate
- [ ] Sign-up/Sign-in flows tested
- [ ] Email verification enabled (if required)

## API Security

### Rate Limiting

- [ ] Rate limiting active on all public endpoints
- [ ] Contact form: 5 requests/minute
- [ ] BYOK stash: 10 requests/minute
- [ ] Checkout creation: rate limited
- [ ] Bout creation: rate limited

### Input Validation

- [ ] All user inputs validated
- [ ] Topic field length limited (500 chars)
- [ ] Preset IDs validated against known presets
- [ ] Agent names validated
- [ ] System prompts validated

### Authorization

- [ ] Admin endpoints require `x-admin-token`
- [ ] Bout ownership validated before execution
- [ ] Credit operations require authentication
- [ ] Premium features gated by subscription tier

## Webhook Security

- [ ] Stripe signature verification enabled
- [ ] Invalid signatures rejected (400)
- [ ] Duplicate webhooks idempotent
- [ ] No sensitive data in webhook responses

## Credit System

- [ ] Preauthorization uses atomic operations
- [ ] Settlement prevents negative balances
- [ ] Refunds recorded correctly
- [ ] Transaction audit trail maintained

## BYOK Security

- [ ] Keys stored in HTTP-only cookies
- [ ] Cookie scoped to `/api/run-bout`
- [ ] `SameSite=Strict` configured
- [ ] `Secure=true` in production
- [ ] 60-second TTL enforced
- [ ] Keys deleted after use

## Infrastructure

### Vercel

- [ ] Environment variables set correctly
- [ ] Secrets not logged
- [ ] Edge functions configured (if used)
- [ ] Error pages don't expose internals

### CDN/Caching

- [ ] API responses not cached
- [ ] Static assets cached appropriately
- [ ] No sensitive data in cached responses

## Monitoring

- [ ] Error tracking configured (Sentry)
- [ ] No sensitive data in error reports
- [ ] Alerts configured for critical errors
- [ ] Log retention appropriate

## Pre-Deployment Verification

Run these commands before deploying:

```bash
# Run security tests
pnpm run qa:security

# Run full test suite
pnpm run test:ci

# Run security scan (requires external tools)
pnpm run security:scan --target https://staging.thepit.cloud

# Verify build succeeds
pnpm run build
```

## Post-Deployment Verification

- [ ] Application loads without errors
- [ ] Authentication flow works
- [ ] Stripe checkout creates session
- [ ] Webhooks received and processed
- [ ] Credit operations functional
- [ ] Premium features gated correctly

## Security Contacts

- Security issues: [security email]
- On-call: [on-call contact]
- Stripe support: https://support.stripe.com
- Clerk support: https://clerk.com/support

## Incident Response

If a security issue is discovered:

1. Assess severity (critical/high/medium/low)
2. If critical: immediately disable affected feature
3. Document the issue and potential impact
4. Fix and deploy patch
5. Notify affected users if data was exposed
6. Post-mortem and preventive measures

---

Last Updated: 2026-02-13
Version: 1.0.0
