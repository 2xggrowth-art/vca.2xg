require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { verifyAuth, verifyAdmin } = require('./middleware/jwtAuth');
const voiceNoteService = require('./services/voiceNoteService');

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL connection pool (only if DATABASE_URL is configured)
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
}) : null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Middleware - Allow multiple origins for development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://192.168.68.125:5173',
  'http://192.168.68.125:5174',
  'http://192.168.68.125:5175',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // For development, allow any localhost/192.168.x.x origin
    if (origin && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/)) {
      return callback(null, true);
    }

    // Check allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Serve voice notes as static files
app.use('/files/voice-notes', express.static(voiceNoteService.getBaseDir()));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// ─── Auth Routes ────────────────────────────────────────────────────────────

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// ─── Admin User Management ──────────────────────────────────────────────────

const AUTHENTIK_URL = process.env.AUTHENTIK_URL;
const AUTHENTIK_API_TOKEN = process.env.AUTHENTIK_API_TOKEN;

// Create user endpoint (Admin only)
app.post('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, fullName, role',
      });
    }

    // Create user in Authentik
    const createRes = await fetch(`${AUTHENTIK_URL}/api/v3/core/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}`,
      },
      body: JSON.stringify({
        username: email,
        email: email,
        name: fullName,
        is_active: true,
        path: 'users',
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.json().catch(() => ({}));
      return res.status(400).json({
        error: errBody.detail || errBody.username?.[0] || 'Failed to create user in Authentik',
      });
    }

    const authentikUser = await createRes.json();

    // Set password in Authentik
    await fetch(`${AUTHENTIK_URL}/api/v3/core/users/${authentikUser.pk}/set_password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}`,
      },
      body: JSON.stringify({ password }),
    });

    // Create user + profile in our database
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO users (id, email, created_at) VALUES ($1, $2, NOW())',
          [authentikUser.pk, email]
        );
        await client.query(
          `INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET full_name = $3, role = $4, updated_at = NOW()`,
          [authentikUser.pk, email, fullName, role]
        );
        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        await fetch(`${AUTHENTIK_URL}/api/v3/core/users/${authentikUser.pk}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}` },
        }).catch(() => {});
        throw dbError;
      } finally {
        client.release();
      }
    } else if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates, return=representation' },
        body: JSON.stringify({
          id: authentikUser.pk,
          email: email,
          full_name: fullName,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    res.status(201).json({
      success: true,
      user: {
        id: authentikUser.pk,
        email: email,
        full_name: fullName,
        role: role,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user endpoint (Admin only)
app.delete('/api/admin/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Look up Authentik user and delete
    const searchRes = await fetch(
      `${AUTHENTIK_URL}/api/v3/core/users/?search=${userId}`,
      {
        headers: { 'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.results && searchData.results.length > 0) {
        await fetch(`${AUTHENTIK_URL}/api/v3/core/users/${searchData.results[0].pk}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}` },
        });
      }
    }

    // Delete from database (cascade should handle related records)
    if (pool) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    } else if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password endpoint (Admin only)
app.post('/api/admin/users/:userId/reset-password', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { temporaryPassword } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!temporaryPassword) {
      return res.status(400).json({ error: 'Temporary password is required' });
    }

    if (temporaryPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Get user's email from database
    let userResult;
    if (pool) {
      userResult = await pool.query(
        'SELECT email FROM profiles WHERE id = $1',
        [userId]
      );
    } else if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=email`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      const rows = profileRes.ok ? await profileRes.json() : [];
      userResult = { rows };
    } else {
      return res.status(500).json({ error: 'No database connection configured' });
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const email = userResult.rows[0].email;

    // Find Authentik user by email
    const usersRes = await fetch(
      `${AUTHENTIK_URL}/api/v3/core/users/?username=${encodeURIComponent(email)}`,
      {
        headers: { 'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}` },
      }
    );

    if (!usersRes.ok) {
      return res.status(500).json({ error: 'Failed to lookup user in authentication system' });
    }

    const usersData = await usersRes.json();
    const authentikUser = usersData.results?.[0];

    if (!authentikUser) {
      return res.status(404).json({ error: 'User not found in authentication system' });
    }

    // Set the new password in Authentik
    const setPassRes = await fetch(
      `${AUTHENTIK_URL}/api/v3/core/users/${authentikUser.pk}/set_password/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTHENTIK_API_TOKEN}`,
        },
        body: JSON.stringify({ password: temporaryPassword }),
      }
    );

    if (!setPassRes.ok) {
      const errText = await setPassRes.text().catch(() => '');
      console.error('Set password failed:', errText);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      user: { id: userId, email },
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Storage Routes (Voice Notes) ───────────────────────────────────────────

const storageRoutes = require('./routes/storageRoutes');
app.use('/api/storage', storageRoutes);

// ─── Upload Routes (Google Drive) ───────────────────────────────────────────

const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Upload endpoints: http://localhost:${PORT}/api/upload/*`);
  console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`Storage endpoints: http://localhost:${PORT}/api/storage/*`);
});
