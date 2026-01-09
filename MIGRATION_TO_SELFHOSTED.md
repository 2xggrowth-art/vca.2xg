# Migration Guide: Supabase to Self-Hosted (OVHCloud + Coolify)

## 📋 Overview

This guide covers migrating your Viral Content Analyzer from Supabase to a self-hosted infrastructure using OVHCloud VPS and Coolify.

**Timeline Estimate:** 2-4 days (depending on data volume and testing requirements)

---

## 🏗️ Current Architecture (Supabase)

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│    - Vite + React + TypeScript      │
│    - Hosted: Vercel/Netlify         │
└──────────────┬──────────────────────┘
               │
               ├─ Auth (Supabase Auth)
               ├─ Database (PostgreSQL)
               ├─ Storage (Supabase Storage)
               └─ Real-time subscriptions
```

---

## 🎯 Target Architecture (Self-Hosted)

```
┌────────────────────────────────────────────────────┐
│              OVHCloud VPS Server                   │
│                                                     │
│  ┌──────────────────────────────────────────┐    │
│  │           Coolify (Docker)               │    │
│  │                                           │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  Frontend (React)               │    │    │
│  │  │  - Nginx + Static Files         │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                           │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  Backend API (Node.js/Express)  │    │    │
│  │  │  - RESTful API                   │    │    │
│  │  │  - JWT Authentication            │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                           │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  PostgreSQL Database            │    │    │
│  │  │  - Data + Schema                 │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                           │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  MinIO (S3-compatible storage)  │    │    │
│  │  │  - File uploads                  │    │    │
│  │  │  - Voice notes                   │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                           │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  Redis (Optional)               │    │    │
│  │  │  - Session management            │    │    │
│  │  │  - Caching                       │    │    │
│  │  └─────────────────────────────────┘    │    │
│  └──────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

---

## 💰 Cost Comparison

### Supabase (Current)
- **Free Tier:** $0/month (limited to 500MB database, 1GB storage)
- **Pro:** $25/month (8GB database, 100GB storage)
- **Team:** $599/month (unlimited)

### OVHCloud + Coolify (Target)
- **VPS Starter:** €6-12/month (2 vCores, 4GB RAM, 80GB SSD)
- **VPS Comfort:** €24/month (4 vCores, 8GB RAM, 160GB SSD) ⭐ **Recommended**
- **VPS Elite:** €48/month (8 vCores, 16GB RAM, 320GB SSD)
- **Coolify:** Free (open-source, self-hosted)

**Total Cost:** €24-48/month with full control and unlimited scaling

---

## 📦 Prerequisites

### 1. OVHCloud VPS
- **Minimum Requirements:**
  - 4 vCores
  - 8GB RAM
  - 160GB SSD
  - Ubuntu 22.04 LTS

### 2. Domain Name
- Purchase domain (optional, can use VPS IP)
- Point DNS to VPS IP
- SSL certificate (Let's Encrypt via Coolify)

### 3. Coolify Installation
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

---

## 🔄 Migration Steps

### Phase 1: Infrastructure Setup (Day 1)

#### Step 1.1: Provision OVHCloud VPS
1. Sign up at https://www.ovhcloud.com/en-in/vps/
2. Choose VPS Comfort (4 vCores, 8GB RAM)
3. Select Ubuntu 22.04 LTS
4. Complete purchase

#### Step 1.2: Initial Server Setup
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Verify installation
docker --version
docker-compose --version
```

#### Step 1.3: Configure Coolify
1. Access Coolify: `http://your-vps-ip:8000`
2. Create admin account
3. Set up domain (if available)
4. Enable SSL (Let's Encrypt)

---

### Phase 2: Database Migration (Day 1-2)

#### Step 2.1: Export Supabase Database
```bash
# From Supabase dashboard, get connection string
# Or use pg_dump

# Export schema
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  -f schema.sql

# Export data
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --no-owner \
  --no-acl \
  -f data.sql
```

#### Step 2.2: Deploy PostgreSQL on Coolify
1. In Coolify, click "New Resource"
2. Select "PostgreSQL"
3. Configure:
   - Name: `viral-content-db`
   - Database: `viral_content_analyzer`
   - User: `app_user`
   - Password: (generate strong password)
4. Deploy

#### Step 2.3: Import Data
```bash
# SSH into Coolify server
ssh root@your-vps-ip

# Find PostgreSQL container
docker ps | grep postgres

# Import schema
docker exec -i <postgres-container-id> \
  psql -U app_user -d viral_content_analyzer \
  < schema.sql

# Import data
docker exec -i <postgres-container-id> \
  psql -U app_user -d viral_content_analyzer \
  < data.sql

# Verify
docker exec -it <postgres-container-id> \
  psql -U app_user -d viral_content_analyzer \
  -c "SELECT COUNT(*) FROM viral_analyses;"
```

---

### Phase 3: Backend API Development (Day 2)

#### Step 3.1: Create Backend API Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # PostgreSQL connection
│   │   └── storage.ts        # MinIO configuration
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   └── cors.ts           # CORS configuration
│   ├── routes/
│   │   ├── auth.ts           # Login, register, logout
│   │   ├── analyses.ts       # CRUD for analyses
│   │   ├── assignments.ts    # Team assignments
│   │   ├── files.ts          # File upload/download
│   │   └── admin.ts          # Admin operations
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── analysesController.ts
│   │   └── filesController.ts
│   ├── models/
│   │   └── (TypeORM/Prisma models)
│   └── server.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

#### Step 3.2: Key Backend Code Examples

**Database Connection (config/database.ts):**
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production',
});
```

**JWT Authentication (middleware/auth.ts):**
```typescript
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
```

**Analyses Routes (routes/analyses.ts):**
```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { analysesController } from '../controllers/analysesController';

const router = express.Router();

// Get all analyses (admin)
router.get('/', authenticateToken, analysesController.getAll);

// Get user's analyses
router.get('/my-analyses', authenticateToken, analysesController.getMyAnalyses);

// Create analysis
router.post('/', authenticateToken, analysesController.create);

// Update analysis
router.put('/:id', authenticateToken, analysesController.update);

// Delete analysis
router.delete('/:id', authenticateToken, analysesController.delete);

export default router;
```

#### Step 3.3: Deploy Backend to Coolify
1. Create Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

2. Push to GitHub
3. In Coolify:
   - New Resource → Git Repository
   - Connect GitHub
   - Select repository
   - Build method: Dockerfile
   - Environment variables:
     ```
     DB_HOST=viral-content-db
     DB_PORT=5432
     DB_NAME=viral_content_analyzer
     DB_USER=app_user
     DB_PASSWORD=<password>
     JWT_SECRET=<generate-strong-secret>
     MINIO_ENDPOINT=minio:9000
     ```
   - Deploy

---

### Phase 4: Storage Migration (Day 2)

#### Step 4.1: Deploy MinIO on Coolify
1. New Resource → MinIO
2. Configure:
   - Name: `viral-content-storage`
   - Access Key: `admin`
   - Secret Key: (generate strong password)
3. Deploy

#### Step 4.2: Migrate Files from Supabase Storage
```bash
# Download files from Supabase
# Use Supabase CLI or API

# Upload to MinIO
npm install minio

# migration-script.ts
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: 'your-vps-ip',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'your-secret',
});

// Create bucket
await minioClient.makeBucket('voice-notes', 'us-east-1');

// Upload files
const files = await downloadFromSupabase();
for (const file of files) {
  await minioClient.putObject('voice-notes', file.name, file.buffer);
}
```

---

### Phase 5: Frontend Migration (Day 3)

#### Step 5.1: Update Frontend API Client
**Before (Supabase):**
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('viral_analyses')
  .select('*');
```

**After (REST API):**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL,
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

const { data } = await api.get('/api/analyses');
```

#### Step 5.2: Update Authentication
**Before:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

**After:**
```typescript
const { data } = await api.post('/api/auth/login', {
  email,
  password,
});
localStorage.setItem('token', data.token);
```

#### Step 5.3: Deploy Frontend to Coolify
1. Update `.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com
```

2. Build:
```bash
npm run build
```

3. Deploy to Coolify:
   - New Resource → Static Site
   - Upload dist folder
   - Or connect GitHub and auto-deploy

---

### Phase 6: DNS & SSL (Day 3)

#### Step 6.1: Configure Domain
1. In domain registrar:
   ```
   A    @       your-vps-ip
   A    api     your-vps-ip
   A    www     your-vps-ip
   ```

2. In Coolify:
   - Add domain to frontend app
   - Add api.yourdomain.com to backend
   - Enable SSL (automatic via Let's Encrypt)

---

### Phase 7: Testing & Validation (Day 4)

#### Checklist:
- [ ] Database connectivity
- [ ] Authentication (login/register/logout)
- [ ] Create viral analysis
- [ ] File upload (voice notes)
- [ ] Team assignments
- [ ] Role-based access control
- [ ] Production file management
- [ ] Google Drive integration
- [ ] All dashboards (Admin, Videographer, Editor)

---

## 🔒 Security Considerations

### 1. Firewall Configuration
```bash
# UFW (Ubuntu Firewall)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 2. Database Security
- Use strong passwords
- Restrict PostgreSQL access to localhost
- Enable SSL for database connections
- Regular backups

### 3. API Security
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention
- XSS protection

### 4. File Upload Security
- Validate file types
- Scan for malware
- Limit file sizes
- Use signed URLs for downloads

---

## 📊 Monitoring & Backups

### Monitoring
```bash
# Install monitoring tools
docker run -d \
  --name=grafana \
  -p 3000:3000 \
  grafana/grafana

# Add Prometheus for metrics
docker run -d \
  --name=prometheus \
  -p 9090:9090 \
  prom/prometheus
```

### Automated Backups
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup database
docker exec <postgres-container> \
  pg_dump -U app_user viral_content_analyzer \
  > $BACKUP_DIR/db_$DATE.sql

# Backup MinIO
mc mirror minio/voice-notes $BACKUP_DIR/files_$DATE/

# Upload to OVHCloud Object Storage (optional)
# or use rclone to backup to another provider

# Keep last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

**Cron job:**
```bash
# Daily at 2 AM
0 2 * * * /root/backup.sh
```

---

## 🚀 Migration Timeline

### Quick Migration (2 Days - Minimal Testing)
- **Day 1:** Setup VPS, Coolify, database migration
- **Day 2:** Deploy backend, frontend, basic testing

### Standard Migration (4 Days - Recommended)
- **Day 1:** Infrastructure setup + database migration
- **Day 2:** Backend API development + deployment
- **Day 3:** Frontend migration + DNS configuration
- **Day 4:** Comprehensive testing + monitoring setup

### Enterprise Migration (1-2 Weeks)
- Includes: Load testing, security audit, documentation, training

---

## 💡 Tips for Smooth Migration

1. **Parallel Running:** Keep Supabase running while testing self-hosted
2. **Data Sync:** Use database replication during transition
3. **Gradual Migration:** Move one feature at a time
4. **Rollback Plan:** Keep Supabase active for 1-2 weeks as backup
5. **Load Testing:** Test with expected user load before going live

---

## 📞 Post-Migration Support

### OVHCloud Support
- 24/7 ticket support
- Phone support (paid plans)
- Community forums

### Coolify Community
- Discord: https://discord.gg/coolify
- GitHub: https://github.com/coollabs/coolify
- Documentation: https://coolify.io/docs

---

## 🎯 When to Migrate?

### Migrate Now If:
- ✅ You need cost predictability
- ✅ You want full control over infrastructure
- ✅ You're hitting Supabase limits
- ✅ You need custom features not in Supabase
- ✅ You have multiple organizations (scaling needs)

### Stay on Supabase If:
- ❌ Your team lacks DevOps experience
- ❌ You're still in early MVP/testing phase
- ❌ You don't want to manage infrastructure
- ❌ Current costs are acceptable

---

## 📈 Scaling on Self-Hosted

### Vertical Scaling (Same Server)
- Upgrade VPS plan (4GB → 8GB → 16GB RAM)
- One-click upgrade in OVHCloud panel
- Zero downtime

### Horizontal Scaling (Multiple Servers)
- Load balancer (Nginx)
- Multiple backend instances
- Database read replicas
- CDN for static assets (Cloudflare)

---

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it <postgres-container> \
  psql -U app_user -d viral_content_analyzer

# Check logs
docker logs <postgres-container>
```

### Backend API Issues
```bash
# Check backend logs
docker logs <backend-container>

# Test API endpoint
curl https://api.yourdomain.com/health

# Check environment variables
docker exec <backend-container> env
```

### Storage Issues
```bash
# Check MinIO is running
docker ps | grep minio

# Test MinIO connection
mc alias set myminio http://localhost:9000 admin password
mc ls myminio
```

---

## ✅ Conclusion

Migration from Supabase to self-hosted infrastructure is **straightforward** and can be completed in **2-4 days**. With OVHCloud + Coolify, you get:

- ✅ **Lower costs** (€24/month vs $599/month for similar capacity)
- ✅ **Full control** over your data and infrastructure
- ✅ **Better scalability** for multiple organizations
- ✅ **No vendor lock-in**
- ✅ **Predictable pricing** as you grow

**Recommendation:** Start with VPS Comfort (€24/month) and migrate during a low-traffic period. Keep Supabase running for 1 week as backup while you verify everything works correctly.

---

## 📚 Additional Resources

- **OVHCloud VPS:** https://www.ovhcloud.com/en-in/vps/
- **Coolify Documentation:** https://coolify.io/docs
- **PostgreSQL Migration:** https://www.postgresql.org/docs/current/backup.html
- **MinIO Documentation:** https://min.io/docs/minio/linux/index.html
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

**Need help with migration? Feel free to ask!** 🚀
