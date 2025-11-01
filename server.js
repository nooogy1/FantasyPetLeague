// server.js - Fantasy Pet League Backend API (Updated with modular routes)
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ============ SERVE STATIC FILES ============
// Serve frontend files from root and subdirectories
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname)));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

console.log('🚀 Starting Fantasy Pet League Server...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Using default');

// ============ IMPORT ROUTE MODULES ============

let authRoutes, leagueRoutes, draftingRoutes, leaderboardRoutes, petRoutes;

try {
  authRoutes = require('./backend/routes/auth');
  console.log('✓ Auth routes loaded');
} catch (e) {
  console.error('✗ Failed to load auth routes:', e.message);
}

try {
  leagueRoutes = require('./backend/routes/leagues');
  console.log('✓ League routes loaded');
} catch (e) {
  console.error('✗ Failed to load league routes:', e.message);
}

try {
  draftingRoutes = require('./backend/routes/drafting');
  console.log('✓ Drafting routes loaded');
} catch (e) {
  console.error('✗ Failed to load drafting routes:', e.message);
}

try {
  leaderboardRoutes = require('./backend/routes/leaderboard');
  console.log('✓ Leaderboard routes loaded');
} catch (e) {
  console.error('✗ Failed to load leaderboard routes:', e.message);
}

try {
  petRoutes = require('./backend/routes/pets');
  console.log('✓ Pet routes loaded');
} catch (e) {
  console.error('✗ Failed to load pet routes:', e.message);
}

let adminRoutes;
try {
  adminRoutes = require('./backend/routes/admin');
  console.log('✓ Admin routes loaded (with scraper endpoint)');
} catch (e) {
  // If admin.js doesn't exist, try admin-dashboard.js
  try {
    adminRoutes = require('./admin-dashboard');
    console.log('✓ Admin dashboard routes loaded');
  } catch (e2) {
    console.error('✗ Failed to load admin routes:', e2.message);
  }
}

// ============ REGISTER ROUTES ============

// Use modular route handlers with /api prefix
if (authRoutes) app.use('/api/auth', authRoutes);
if (leagueRoutes) app.use('/api/leagues', leagueRoutes);
if (draftingRoutes) app.use('/api/drafting', draftingRoutes);
if (leaderboardRoutes) app.use('/api/leaderboard', leaderboardRoutes);
if (petRoutes) app.use('/api/pets', petRoutes);

// Register admin routes WITHOUT /api prefix (so /admin/scrape works)
if (adminRoutes) app.use('/admin', adminRoutes);

console.log('\n✓ All routes registered:');
console.log('  - /api/auth');
console.log('  - /api/leagues');
console.log('  - /api/drafting');
console.log('  - /api/leaderboard');
console.log('  - /api/pets');
console.log('  - /admin (admin routes including /admin/scrape)');

// ============ SERVE HTML PAGES ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/league.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'league.html'));
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fantasy Pet League is running' });
});

// ============ API ENDPOINTS LIST ============

app.get('/api/endpoints', (req, res) => {
  res.json({
    auth: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'POST /api/auth/verify'
    ],
    leagues: [
      'GET /api/leagues',
      'POST /api/leagues',
      'GET /api/leagues/:leagueId',
      'PUT /api/leagues/:leagueId',
      'DELETE /api/leagues/:leagueId',
      'GET /api/leagues/:leagueId/members'
    ],
    drafting: [
      'POST /api/drafting',
      'GET /api/drafting/:leagueId',
      'DELETE /api/drafting/:petId/:leagueId',
      'GET /api/drafting/league/:leagueId/rosters',
      'GET /api/drafting/history/:leagueId'
    ],
    leaderboard: [
      'GET /api/leaderboard/:leagueId',
      'GET /api/leaderboard/',
      'GET /api/leaderboard/user/:userId/league/:leagueId',
      'GET /api/leaderboard/user/:userId',
      'GET /api/leaderboard/top/alltime',
      'POST /api/leaderboard/refresh',
      'GET /api/leaderboard/stats/:leagueId'
    ],
    pets: [
      'GET /api/pets',
      'GET /api/pets/id/:petId',
      'GET /api/pets/count/available',
      'GET /api/pets/type/:animalType',
      'GET /api/pets/breed/:breed',
      'GET /api/pets/adopted/recent',
      'GET /api/pets/new/today',
      'GET /api/pets/stats/overview',
      'GET /api/pets/stats/popular-breeds',
      'GET /api/pets/stats/draft-popularity'
    ],
    admin: [
      'POST /admin/scrape (admin only)',
      'GET /admin/stats (admin only)',
      'GET /admin/breeds (admin only)',
      'GET /admin/breeds/missing (admin only)',
      'POST /admin/breeds/auto-populate (admin only)',
      'POST /admin/breeds (admin only)',
      'PUT /admin/breeds/:breedId (admin only)',
      'DELETE /admin/breeds/:breedId (admin only)',
      'GET /admin/scraper-logs (admin only)'
    ]
  });
});

// ============ 404 HANDLER ============

app.use((req, res) => {
  console.warn(`⚠ 404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// ============ ERROR HANDLER ============

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============ DISCORD BOT ============

// Optional: Start Discord bot if token is provided
if (process.env.DISCORD_BOT_TOKEN) {
  try {
    const { startBot } = require('./discord-bot');
    startBot();
    console.log('✓ Discord bot started');
  } catch (error) {
    console.warn('⚠ Discord bot not available:', error.message);
  }
}

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🐾 Fantasy Pet League Server Running`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/admin-dashboard`);
  console.log(`API Docs: http://localhost:${PORT}/api/endpoints`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`${'='.repeat(60)}\n`);
});