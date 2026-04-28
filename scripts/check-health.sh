#!/bin/bash

echo "Checking frontend build..."
npm run build || exit 1

echo "Checking backend send-sms route..."
curl -f https://cub-bridge-api.vercel.app/api/send-sms || exit 1

echo ""
echo "Health checks passed."