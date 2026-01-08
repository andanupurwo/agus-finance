#!/bin/bash

# Script to deploy to the correct environment based on git branch

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "================================"
echo "Current Git Branch: $CURRENT_BRANCH"
echo "================================"

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo ""
  echo "🚀 PRODUCTION DEPLOYMENT"
  echo "Deploying to: agus-finance.web.app"
  echo ""
  firebase use default
  npm run build
  firebase deploy --only hosting
  
elif [ "$CURRENT_BRANCH" = "dev" ]; then
  echo ""
  echo "🧪 DEVELOPMENT DEPLOYMENT"
  echo "Deploying to: dev-agus-finance.web.app"
  echo ""
  firebase use dev
  npm run build
  firebase deploy --only hosting
  
else
  echo "❌ Error: You are on branch '$CURRENT_BRANCH'"
  echo "Only 'main' and 'dev' branches can be deployed."
  echo ""
  echo "Current branches:"
  git branch -a
  exit 1
fi

echo ""
echo "✅ Deployment complete!"
