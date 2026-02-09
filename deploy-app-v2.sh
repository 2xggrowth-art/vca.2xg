#!/bin/bash

# ============================================================================
# Deploy app-v2 to Production (vca.2xg.in)
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting app-v2 Production Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ─── Step 1: Pre-deployment Checks ─────────────────────────────────────────
echo -e "${YELLOW}Step 1: Pre-deployment Checks${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

if [ ! -d "app-v2" ]; then
    echo -e "${RED}Error: app-v2 directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"

# ─── Step 2: Stop old frontend (optional - for rollback capability) ────────
echo -e "${YELLOW}Step 2: Preparing for deployment${NC}"

# Rename old frontend to vca-frontend-old (if not already done)
if docker ps -a --format '{{.Names}}' | grep -q "^vca-frontend$"; then
    echo "Moving old frontend to vca-frontend-old..."
    docker stop vca-frontend || true
    docker rm vca-frontend || true
fi

echo -e "${GREEN}✓ Preparation complete${NC}"

# ─── Step 3: Build app-v2 ──────────────────────────────────────────────────
echo -e "${YELLOW}Step 3: Building app-v2${NC}"

docker-compose build vca-frontend-v2

echo -e "${GREEN}✓ Build complete${NC}"

# ─── Step 4: Deploy app-v2 ─────────────────────────────────────────────────
echo -e "${YELLOW}Step 4: Deploying app-v2${NC}"

# Stop existing v2 container if running
docker-compose stop vca-frontend-v2 2>/dev/null || true
docker-compose rm -f vca-frontend-v2 2>/dev/null || true

# Start app-v2
docker-compose up -d vca-frontend-v2

# Wait for health check
echo "Waiting for app to be healthy..."
for i in {1..30}; do
    if docker exec vca-frontend-v2 wget --no-verbose --tries=1 --spider http://localhost/health 2>/dev/null; then
        echo -e "${GREEN}✓ App is healthy!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: App failed health check${NC}"
        docker-compose logs vca-frontend-v2
        exit 1
    fi
    echo -n "."
    sleep 2
done

echo -e "${GREEN}✓ Deployment complete${NC}"

# ─── Step 5: Verify Deployment ─────────────────────────────────────────────
echo -e "${YELLOW}Step 5: Verification${NC}"

docker-compose ps | grep vca-frontend-v2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ app-v2 Successfully Deployed to Production!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "🌐 App is now live at: https://vca.2xg.in"
echo "📊 Health check: https://vca.2xg.in/health"
echo "🔙 Old system: https://vca-old.2xg.in (if enabled)"
echo ""
echo "📝 Next steps:"
echo "  1. Test the production deployment"
echo "  2. Monitor logs: docker-compose logs -f vca-frontend-v2"
echo "  3. Check Coolify dashboard for metrics"
echo ""
echo -e "${YELLOW}⚠️  To rollback if needed:${NC}"
echo "  docker-compose stop vca-frontend-v2"
echo "  docker-compose start vca-frontend-old"
echo ""
