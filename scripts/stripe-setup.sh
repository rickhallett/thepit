#!/usr/bin/env bash
set -euo pipefail

# Requires: stripe CLI installed and authenticated (stripe login)
# Usage: ./scripts/stripe-setup.sh

echo "Creating webhook endpoint..."
WEBHOOK=$(stripe webhook_endpoints create \
  --url "https://thepit.cloud/api/credits/webhook" \
  --enabled-events "checkout.session.completed" \
  --api-version "2023-10-16" \
  --format json)

SECRET=$(echo "$WEBHOOK" | jq -r '.secret')
echo "Webhook secret: $SECRET"
echo ""
echo "Now run:"
echo "  vercel env add STRIPE_WEBHOOK_SECRET production"
echo "  (paste: $SECRET)"
echo ""
echo "Also ensure STRIPE_SECRET_KEY is set:"
echo "  vercel env add STRIPE_SECRET_KEY production"
echo ""
echo "Finally enable credits:"
echo "  vercel env add CREDITS_ENABLED production"
echo "  (value: true)"
