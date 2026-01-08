#!/bin/bash

# Firebase Project Manager Script
# Usage: ./scripts/firebase-setup.sh [prod|dev]

ENVIRONMENT=${1:-dev}

echo "Switching Firebase project to: $ENVIRONMENT"

if [ "$ENVIRONMENT" = "prod" ]; then
  firebase use agus-finance
  echo "✓ Switched to Production Firebase Project (agus-finance)"
  echo "  Hosting: https://agus-finance.web.app"
elif [ "$ENVIRONMENT" = "dev" ]; then
  firebase use dev-agus-finance
  echo "✓ Switched to Development Firebase Project (dev-agus-finance)"
  echo "  Hosting: https://dev-agus-finance.web.app"
else
  echo "✗ Invalid environment. Use 'prod' or 'dev'"
  exit 1
fi

echo ""
echo "Update .env.local dengan VITE_ENVIRONMENT=$ENVIRONMENT jika belum"
