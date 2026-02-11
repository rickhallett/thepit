#!/usr/bin/env bash
set -euo pipefail

# Requires: stripe CLI installed and authenticated (stripe login)
# Usage: ./scripts/stripe-setup.sh

echo "=== Creating Subscription Products ==="
echo ""

echo "Creating Pit Pass product (£3/mo)..."
PASS_PRODUCT=$(stripe products create \
  --name "THE PIT — Pit Pass" \
  --description "15 bouts/day, Haiku + Sonnet, 5 custom agents" \
  --format json)

PASS_PRODUCT_ID=$(echo "$PASS_PRODUCT" | jq -r '.id')
echo "Pass product ID: $PASS_PRODUCT_ID"

PASS_PRICE=$(stripe prices create \
  --product "$PASS_PRODUCT_ID" \
  --unit-amount 300 \
  --currency gbp \
  --recurring-interval month \
  --format json)

PASS_PRICE_ID=$(echo "$PASS_PRICE" | jq -r '.id')
echo "Pass price ID: $PASS_PRICE_ID"
echo ""

echo "Creating Pit Lab product (£10/mo)..."
LAB_PRODUCT=$(stripe products create \
  --name "THE PIT — Pit Lab" \
  --description "100 bouts/day, all models, unlimited agents, API access" \
  --format json)

LAB_PRODUCT_ID=$(echo "$LAB_PRODUCT" | jq -r '.id')
echo "Lab product ID: $LAB_PRODUCT_ID"

LAB_PRICE=$(stripe prices create \
  --product "$LAB_PRODUCT_ID" \
  --unit-amount 1000 \
  --currency gbp \
  --recurring-interval month \
  --format json)

LAB_PRICE_ID=$(echo "$LAB_PRICE" | jq -r '.id')
echo "Lab price ID: $LAB_PRICE_ID"
echo ""

echo "=== Creating Webhook Endpoint ==="
echo ""

WEBHOOK=$(stripe webhook_endpoints create \
  --url "https://thepit.cloud/api/credits/webhook" \
  --enabled-events \
    "checkout.session.completed" \
    "customer.subscription.created" \
    "customer.subscription.updated" \
    "customer.subscription.deleted" \
    "invoice.payment_failed" \
    "invoice.payment_succeeded" \
  --api-version "2023-10-16" \
  --format json)

SECRET=$(echo "$WEBHOOK" | jq -r '.secret')
echo "Webhook secret: $SECRET"
echo ""

echo "=== Environment Variables ==="
echo ""
echo "Add these to your .env and deployment:"
echo ""
echo "  STRIPE_PASS_PRICE_ID=$PASS_PRICE_ID"
echo "  STRIPE_LAB_PRICE_ID=$LAB_PRICE_ID"
echo "  STRIPE_WEBHOOK_SECRET=$SECRET"
echo ""
echo "Deployment commands:"
echo "  vercel env add STRIPE_PASS_PRICE_ID production"
echo "  vercel env add STRIPE_LAB_PRICE_ID production"
echo "  vercel env add STRIPE_WEBHOOK_SECRET production"
echo "  vercel env add SUBSCRIPTIONS_ENABLED production (value: true)"
