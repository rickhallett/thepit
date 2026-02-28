#!/usr/bin/env bash
set -euo pipefail

# Creates Stripe subscription products and webhook for The Pit.
# Requires: stripe CLI installed and authenticated (stripe login), jq
# Usage: ./scripts/stripe-setup.sh

# ── Pre-flight checks ────────────────────────────────────────────

command -v stripe >/dev/null 2>&1 || { echo "ERROR: stripe CLI not found. Install: https://stripe.com/docs/stripe-cli"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found. Install: https://stedolan.github.io/jq/"; exit 1; }

# Verify stripe is authenticated by making a lightweight API call
if ! stripe config --list >/dev/null 2>&1; then
  echo "ERROR: stripe CLI not authenticated. Run 'stripe login' first."
  exit 1
fi

# Helper: extract a field from JSON, fail if null/empty
extract() {
  local value
  value=$(echo "$1" | jq -r "$2" 2>/dev/null)
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "ERROR: Failed to extract '$2' from Stripe response:"
    echo "$1" | head -20
    exit 1
  fi
  echo "$value"
}

echo "=== Creating Subscription Products ==="
echo ""

# ── Pit Pass (£3/mo) ─────────────────────────────────────────────

echo "Creating Pit Pass product (£3/mo)..."
PASS_PRODUCT=$(stripe products create \
  --name "The Pit - Pit Pass" \
  --description "15 bouts/day, Haiku + Sonnet, 5 custom agents" \
  -c) || { echo "ERROR: Failed to create Pass product"; exit 1; }

PASS_PRODUCT_ID=$(extract "$PASS_PRODUCT" '.id')
echo "  Product ID: $PASS_PRODUCT_ID"

PASS_PRICE=$(stripe prices create \
  --product "$PASS_PRODUCT_ID" \
  --unit-amount 300 \
  --currency gbp \
  --recurring.interval month \
  -c) || { echo "ERROR: Failed to create Pass price"; exit 1; }

PASS_PRICE_ID=$(extract "$PASS_PRICE" '.id')
echo "  Price ID:   $PASS_PRICE_ID"
echo ""

# ── Pit Lab (£10/mo) ─────────────────────────────────────────────

echo "Creating Pit Lab product (£10/mo)..."
LAB_PRODUCT=$(stripe products create \
  --name "The Pit - Pit Lab" \
  --description "100 bouts/day, all models, unlimited agents, API access" \
  -c) || { echo "ERROR: Failed to create Lab product"; exit 1; }

LAB_PRODUCT_ID=$(extract "$LAB_PRODUCT" '.id')
echo "  Product ID: $LAB_PRODUCT_ID"

LAB_PRICE=$(stripe prices create \
  --product "$LAB_PRODUCT_ID" \
  --unit-amount 1000 \
  --currency gbp \
  --recurring.interval month \
  -c) || { echo "ERROR: Failed to create Lab price"; exit 1; }

LAB_PRICE_ID=$(extract "$LAB_PRICE" '.id')
echo "  Price ID:   $LAB_PRICE_ID"
echo ""

# ── Webhook ───────────────────────────────────────────────────────

echo "Creating webhook endpoint..."
WEBHOOK=$(stripe webhook_endpoints create \
  --url "https://thepit.cloud/api/credits/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=invoice.payment_failed" \
  -d "enabled_events[]=invoice.payment_succeeded" \
  --api-version "2023-10-16" \
  -c) || { echo "ERROR: Failed to create webhook endpoint"; exit 1; }

SECRET=$(extract "$WEBHOOK" '.secret')
echo "  Webhook secret: ${SECRET:0:12}..."
echo ""

# ── Summary ───────────────────────────────────────────────────────

echo "=== Setup Complete ==="
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
echo ""
echo "NOTE: Running this script again will create DUPLICATE products."
echo "To manage existing products, use the Stripe Dashboard."
