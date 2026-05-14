#!/bin/bash
set -e

echo "🚀 Survey Automation - Deployment Script"
echo "=========================================="

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker and docker-compose first."
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️ Warning: .env file not found!"
    echo "Creating .env from .env.example. Please edit it with your real secrets and run this script again."
    cp .env.example .env
    exit 1
fi

# Load variables to check DOMAIN (basic validation)
source .env
if [ "$DOMAIN" = "localhost" ]; then
    echo "⚠️ Warning: DOMAIN is set to 'localhost' in .env."
    echo "If you are deploying to production, please update it to your real domain (e.g., surveys.yourdomain.com)."
    echo "Waiting 5 seconds before continuing..."
    sleep 5
fi

echo "📦 Pulling latest changes (if any)..."
git pull origin main || echo "Not a git repository or no remote configured, continuing..."

echo "🏗️ Building and starting Docker containers..."
# Use docker compose plugin
docker compose up --build -d

echo ""
echo "✅ Deployment initiated!"
echo "It may take a few minutes for Caddy to provision SSL certificates via Let's Encrypt."
echo ""
echo "Dashboard: https://${DOMAIN}"
echo "n8n Web UI: https://${DOMAIN}/n8n/"
echo ""
echo "To view logs, run: docker compose logs -f"
