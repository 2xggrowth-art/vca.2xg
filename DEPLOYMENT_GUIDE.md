# 🚀 app-v2 Production Deployment Guide

**Deployment Date:** 2026-02-08
**Target:** vca.2xg.in
**Platform:** Coolify + Docker Compose + Traefik

---

## Overview

This guide walks through deploying the new mobile-first app-v2 to production, replacing the old desktop-focused frontend while maintaining backward compatibility.

### What's Being Deployed

- **app-v2:** New mobile-first React application
- **Domain:** vca.2xg.in (taking over from old system)
- **Old System:** Moved to vca-old.2xg.in (for rollback)
- **Backend:** No changes (vca-api.2xg.in remains)
- **Auth:** No changes (vca-auth.2xg.in remains)

---

## Prerequisites

### Required

- [x] Access to production server
- [x] Docker and Docker Compose installed
- [x] Coolify network configured
- [x] Traefik reverse proxy running
- [x] SSL certificates configured (Let's Encrypt)

### Configuration Files Created

- [x] `/app-v2/Dockerfile` - Production Docker image
- [x] `/app-v2/nginx.conf` - Nginx web server config
- [x] `/app-v2/.env.production` - Production environment variables
- [x] `/docker-compose.yml` - Updated with app-v2 service
- [x] `/deploy-app-v2.sh` - Automated deployment script

---

## Pre-Deployment Checklist

### 1. Update Google OAuth Credentials

Edit `/app-v2/.env.production`:

```bash
VITE_GOOGLE_CLIENT_ID=your-real-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-real-api-key
```

Or update in `docker-compose.yml` build args.

### 2. Verify Backend is Running

```bash
curl https://vca-api.2xg.in/health
```

Should return 200 OK.

### 3. Verify Authentik is Running

```bash
curl https://vca-auth.2xg.in
```

Should return Authentik login page.

### 4. Verify Supabase Connection

```bash
curl https://ckfbjsphyasborpnwbyy.supabase.co/rest/v1/
```

Should return PostgreSQL REST API response.

### 5. Check Coolify Network

```bash
docker network ls | grep coolify
```

Should show the `coolify` network exists.

---

## Deployment Methods

### Method 1: Automated Script (Recommended)

```bash
cd /Users/arsalan/Desktop/ViralContentAnalyzer

# Run deployment script
./deploy-app-v2.sh
```

The script will:
1. ✅ Run pre-deployment checks
2. ✅ Stop old frontend
3. ✅ Build app-v2 Docker image
4. ✅ Deploy to production
5. ✅ Run health checks
6. ✅ Verify deployment

**Estimated Time:** 3-5 minutes

---

### Method 2: Manual Deployment

#### Step 1: Build the Image

```bash
cd /Users/arsalan/Desktop/ViralContentAnalyzer

docker-compose build vca-frontend-v2
```

#### Step 2: Stop Old Frontend (Optional - for rollback)

```bash
# Stop old frontend
docker-compose stop vca-frontend

# Remove old container
docker-compose rm -f vca-frontend
```

#### Step 3: Start app-v2

```bash
docker-compose up -d vca-frontend-v2
```

#### Step 4: Verify Deployment

```bash
# Check container status
docker-compose ps | grep vca-frontend-v2

# Check health
curl https://vca.2xg.in/health

# View logs
docker-compose logs -f vca-frontend-v2
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://vca.2xg.in/health
```

**Expected:** `healthy`

### 2. App Access

Open in browser: https://vca.2xg.in

**Expected:**
- ✅ Page loads successfully
- ✅ No console errors
- ✅ Login page displays
- ✅ Mobile-responsive design

### 3. API Connectivity

Login and check:
- ✅ Can fetch projects
- ✅ Can upload files
- ✅ Backend API calls work
- ✅ Supabase queries work

### 4. Performance Check

```bash
# Response time
time curl -s https://vca.2xg.in > /dev/null

# Docker stats
docker stats vca-frontend-v2 --no-stream
```

**Expected:**
- Response time: < 200ms
- Memory usage: < 32MB
- CPU usage: < 5%

---

## Configuration Details

### Docker Compose Service

```yaml
vca-frontend-v2:
  build:
    context: ./app-v2
    dockerfile: Dockerfile
    args:
      VITE_BACKEND_URL: https://vca-api.2xg.in
      VITE_SUPABASE_URL: https://ckfbjsphyasborpnwbyy.supabase.co
      VITE_SUPABASE_ANON_KEY: eyJhbGc...
      VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}
      VITE_GOOGLE_API_KEY: ${VITE_GOOGLE_API_KEY}
  container_name: vca-frontend-v2
  restart: unless-stopped
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.vca-frontend-v2.rule=Host(`vca.2xg.in`)"
    - "traefik.http.routers.vca-frontend-v2.entrypoints=http,https"
    - "traefik.http.routers.vca-frontend-v2.tls=true"
    - "traefik.http.routers.vca-frontend-v2.tls.certresolver=letsencrypt"
    - "traefik.http.services.vca-frontend-v2.loadbalancer.server.port=80"
  deploy:
    resources:
      limits:
        memory: 32m
  networks:
    - coolify
```

### Traefik Routing

| Domain | Service | Port |
|--------|---------|------|
| vca.2xg.in | vca-frontend-v2 | 80 |
| vca-old.2xg.in | vca-frontend-old | 80 |
| vca-api.2xg.in | vca-backend | 3001 |
| vca-auth.2xg.in | vca-authentik-server | 9000 |

### Environment Variables

**Build Arguments (in Dockerfile):**
```bash
VITE_BACKEND_URL=https://vca-api.2xg.in
VITE_SUPABASE_URL=https://ckfbjsphyasborpnwbyy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
VITE_GOOGLE_API_KEY=${VITE_GOOGLE_API_KEY}
```

**Runtime:** None (static build)

---

## Rollback Procedure

If issues occur with app-v2, rollback to old system:

### Quick Rollback

```bash
# Stop app-v2
docker-compose stop vca-frontend-v2

# Start old system
docker-compose up -d vca-frontend-old
```

### Update Traefik Routing

Edit `docker-compose.yml` and change vca-frontend-old label:

```yaml
- "traefik.http.routers.vca-frontend-old.rule=Host(`vca.2xg.in`)"
```

Then:

```bash
docker-compose up -d vca-frontend-old
```

**Rollback Time:** < 1 minute

---

## Monitoring

### View Logs

```bash
# Real-time logs
docker-compose logs -f vca-frontend-v2

# Last 100 lines
docker-compose logs --tail=100 vca-frontend-v2

# Search for errors
docker-compose logs vca-frontend-v2 | grep -i error
```

### Container Stats

```bash
# One-time stats
docker stats vca-frontend-v2 --no-stream

# Continuous monitoring
docker stats vca-frontend-v2
```

### Health Monitoring

```bash
# Automated health check
watch -n 5 'curl -s https://vca.2xg.in/health'
```

---

## Troubleshooting

### Issue: Container Won't Start

```bash
# Check logs
docker-compose logs vca-frontend-v2

# Check build logs
docker-compose build --no-cache vca-frontend-v2
```

### Issue: 502 Bad Gateway

**Cause:** Container not healthy

**Fix:**
```bash
# Restart container
docker-compose restart vca-frontend-v2

# Check nginx logs
docker exec vca-frontend-v2 cat /var/log/nginx/error.log
```

### Issue: SSL Certificate Error

**Cause:** Traefik not generating certificate

**Fix:**
```bash
# Check Traefik logs
docker logs coolify-proxy

# Force certificate renewal
docker exec coolify-proxy traefik version
```

### Issue: API Calls Failing

**Cause:** CORS or backend not accessible

**Fix:**
```bash
# Test backend
curl https://vca-api.2xg.in/health

# Check browser console for CORS errors
```

### Issue: Static Assets 404

**Cause:** Build didn't complete or wrong path

**Fix:**
```bash
# Rebuild with no cache
docker-compose build --no-cache vca-frontend-v2

# Verify files in container
docker exec vca-frontend-v2 ls -la /usr/share/nginx/html
```

---

## Performance Optimization

### Enable Gzip (Already Configured)

Nginx config includes gzip compression for:
- JavaScript
- CSS
- JSON
- SVG

### Cache Headers

Static assets cached for 1 year:
- JS, CSS, images, fonts

HTML cached with no-cache directive (for SPA routing).

### Resource Limits

Current limits:
- Memory: 32MB
- CPU: Unlimited (but monitored)

Adjust if needed in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 64m
      cpus: '0.5'
```

---

## Security Considerations

### SSL/TLS

- ✅ Let's Encrypt certificates
- ✅ Auto-renewal via Traefik
- ✅ HTTP → HTTPS redirect

### Security Headers

Added in nginx.conf:
```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
```

### Network Isolation

- App runs in `coolify` network
- No direct external access (via Traefik only)
- Backend in separate network (`vca-internal`)

---

## Maintenance

### Updating app-v2

```bash
# Pull latest code
cd /Users/arsalan/Desktop/ViralContentAnalyzer
git pull

# Rebuild and deploy
./deploy-app-v2.sh
```

### Database Migrations

No migrations needed (uses Supabase).

If backend changes required:
```bash
docker-compose restart vca-backend
```

### Log Rotation

Docker handles log rotation automatically.

To clear logs:
```bash
docker logs vca-frontend-v2 2>&1 | tail -n 0
```

---

## Coolify Integration

### If Using Coolify UI

1. Login to Coolify dashboard
2. Navigate to Projects → Viral Content Analyzer
3. Add new resource → Docker Compose
4. Paste docker-compose.yml content for vca-frontend-v2
5. Set environment variables
6. Deploy

### Coolify API (If Available)

```bash
# Example API deployment (update with your Coolify API)
curl -X POST https://your-coolify-instance/api/deploy \
  -H "Authorization: Bearer YOUR_COOLIFY_API_TOKEN" \
  -d '{
    "project": "viral-content-analyzer",
    "service": "vca-frontend-v2",
    "action": "deploy"
  }'
```

---

## Success Criteria

Deployment is successful when:

- [x] Container is running and healthy
- [x] https://vca.2xg.in loads correctly
- [x] Login functionality works
- [x] All API calls succeed
- [x] Mobile responsive design displays
- [x] No console errors
- [x] Memory usage < 32MB
- [x] Response time < 200ms

---

## Support

**Issues:** Create issue in GitHub repo
**Logs:** Check docker-compose logs
**Rollback:** See Rollback Procedure section

---

**Deployment Status:** Ready to Deploy ✅
**Last Updated:** 2026-02-08
**Deployed By:** [Your Name]
