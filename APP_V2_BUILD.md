# App V2 Build Documentation

## Password Management Implementation (2026-02-05)

### Overview
Implemented complete password management system with three features:
1. **Password Change** - All users can change their password in Settings
2. **Forgot Password** - Reset via email link from login screen
3. **Admin Password Reset** - Admin can set temporary password for any user

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  Authentik  │
│  (app-v2)   │     │  (Express)  │     │   (IdP)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │  (tokens)   │
                    └─────────────┘
```

---

## New Files Created

### Backend
| File | Description |
|------|-------------|
| `backend/src/utils/email.js` | Nodemailer SMTP utility for sending password reset emails |
| `supabase/migrations/20260205_password_reset_tokens.sql` | Database table for reset tokens |

### Frontend (app-v2)
| File | Description |
|------|-------------|
| `src/pages/SettingsPage.tsx` | User settings with password change form |
| `src/pages/ForgotPasswordPage.tsx` | Request password reset email |
| `src/pages/ResetPasswordPage.tsx` | Set new password from email link |
| `src/components/admin/ResetPasswordModal.tsx` | Admin modal to reset user passwords |

---

## Modified Files

### Backend
| File | Changes |
|------|---------|
| `backend/src/routes/authRoutes.js` | Added `/change-password`, `/forgot-password`, `/reset-password` endpoints |
| `backend/src/index.js` | Added `/api/admin/users/:userId/reset-password` endpoint |
| `backend/package.json` | Added `nodemailer` dependency |

### Frontend (app-v2)
| File | Changes |
|------|---------|
| `src/lib/api.ts` | Added `auth.changePassword()`, `auth.forgotPassword()`, `auth.resetPassword()` |
| `src/services/adminService.ts` | Added `resetUserPassword()` method |
| `src/App.tsx` | Added routes for settings, forgot-password, reset-password |
| `src/pages/LoginPage.tsx` | Added "Forgot password?" link |
| `src/pages/admin/TeamPage.tsx` | Added reset password button + modal |
| `src/components/Header.tsx` | Added settings icon and navigation |

---

## API Endpoints

### Authentication Routes (`/api/auth/*`)

#### POST `/api/auth/change-password`
**Auth Required:** JWT Token

```json
// Request
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}

// Response
{ "message": "Password changed successfully" }
```

#### POST `/api/auth/forgot-password`
**Auth Required:** None

```json
// Request
{ "email": "user@example.com" }

// Response (always success for security)
{ "message": "If an account exists, a reset link has been sent" }
```

#### POST `/api/auth/reset-password`
**Auth Required:** None (uses token)

```json
// Request
{
  "token": "reset_token_from_email",
  "newPassword": "new_password"
}

// Response
{ "message": "Password reset successfully" }
```

### Admin Routes (`/api/admin/*`)

#### POST `/api/admin/users/:userId/reset-password`
**Auth Required:** Admin JWT Token

```json
// Request
{ "temporaryPassword": "TempPass123!" }

// Response
{ "message": "Password reset successfully" }
```

---

## Database Schema

### password_reset_tokens
```sql
CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `idx_password_reset_tokens_token` - Fast token lookup
- `idx_password_reset_tokens_email` - Fast email lookup
- `idx_password_reset_tokens_expires` - Cleanup queries

---

## Environment Variables

### SMTP Configuration (Backend)
Add these to `.env` for email functionality:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM=VCA <noreply@example.com>
FRONTEND_URL=https://app.yourdomain.com
```

---

## Frontend Routes Added

| Route | Page | Access |
|-------|------|--------|
| `/forgot-password` | ForgotPasswordPage | Public |
| `/reset-password` | ResetPasswordPage | Public (requires token) |
| `/writer/settings` | SettingsPage | Script Writers |
| `/videographer/settings` | SettingsPage | Videographers |
| `/editor/settings` | SettingsPage | Editors |
| `/posting/settings` | SettingsPage | Posting Managers |
| `/admin/settings` | SettingsPage | Admins |

---

## User Flows

### 1. Change Password (Settings)
```
User clicks Settings → Enter current password → Enter new password →
Confirm new password → Click "Update Password" → Success toast
```

### 2. Forgot Password
```
Login page → Click "Forgot password?" → Enter email → Click "Send Reset Link" →
Check email → Click reset link → Enter new password → Confirm →
Click "Reset Password" → Redirect to login
```

### 3. Admin Reset Password
```
Admin → Team page → Click "Reset Password" on user →
Enter/generate temporary password → Copy to clipboard →
Click "Reset Password" → Share password with user
```

---

## Security Measures

1. **Rate limiting** - Recommended on forgot-password endpoint
2. **Token expiry** - 1 hour for reset tokens
3. **Single-use tokens** - Marked as used after password reset
4. **Password requirements** - Minimum 8 characters
5. **Current password required** - For self-service password change
6. **Generic responses** - Forgot password doesn't reveal if email exists

---

## Local Docker Deployment

### Start Containers
```bash
# Create .env file from example
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# Run migration
docker exec -i vca-postgres psql -U postgres -d postgres < supabase/migrations/20260205_password_reset_tokens.sql
```

### Verify Deployment
```bash
# Check container status
docker ps | grep vca

# Check backend logs
docker logs vca-backend

# Test health endpoint
curl http://localhost:3000/health
```

### Services
| Service | Port | Description |
|---------|------|-------------|
| vca-frontend | 80 | React app (nginx) |
| vca-backend | 3000 | Express.js API |
| vca-postgrest | 3001 | PostgREST API |
| vca-postgres | 5432 | PostgreSQL database |
| vca-authentik-server | 9000 | Authentik IdP |

---

## Build Status

### Completed ✅
- [x] Database migration for password_reset_tokens
- [x] Backend change-password endpoint
- [x] Backend forgot-password endpoint
- [x] Backend reset-password endpoint
- [x] Backend admin reset endpoint
- [x] Frontend API client updates
- [x] Settings page with password change
- [x] Forgot password page
- [x] Reset password page
- [x] Admin reset password modal
- [x] Docker containers rebuilt
- [x] Local deployment verified
- [x] Gmail SMTP configured (arsalanahmed507@gmail.com)
- [x] Production Authentik integration configured
- [x] TypeScript build passes with no errors

### Optional Enhancements
- [ ] Set up rate limiting on auth endpoints
- [ ] Add password strength indicator UI
- [ ] Email templates customization

---

## Local Development with Production Auth

### Configuration
The local setup uses:
- **Production Authentik** at `https://vca-auth.2xg.in`
- **Gmail SMTP** for password reset emails
- **Local PostgreSQL** for database

### Environment Variables (.env)
```env
# Production Authentik
AUTHENTIK_URL=https://vca-auth.2xg.in
AUTHENTIK_CLIENT_ID=BfLdfHoHNdFUuiLoPg1IM8Q9vY91xh693dtF0MGc
AUTHENTIK_CLIENT_SECRET=<from_production>
AUTHENTIK_API_TOKEN=<from_production>
JWT_SECRET=<from_production>

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=arsalanahmed507@gmail.com
SMTP_PASS=<app_password>

# Local URLs
FRONTEND_URL=http://192.168.68.125:5174
```

### Mobile Testing URLs
| Service | URL |
|---------|-----|
| PWA App | `http://192.168.68.125:5174` |
| Backend API | `http://192.168.68.125:3000` |
| PostgREST | `http://192.168.68.125:3001` |

### Test Users (from production)
| Role | Email |
|------|-------|
| Admin | arsalanahmed507@gmail.com |
| Editor | abhishekbrmys@gmail.com |
| Videographer | videographer@bch.com |
| Script Writer | varun@gmail.com |
| Posting Manager | manager@bch.com |
