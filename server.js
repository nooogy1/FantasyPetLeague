// server.js - Fantasy Pet League Backend API (Scraper Removed)
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ============ SERVE STATIC FILES ============
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname)));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

console.log('🚀 Starting Fantasy Pet League Server...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✔ Set' : '✗ Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✔ Set' : '✗ Using default');

// ============ IMPORT ROUTE MODULES ============

let authRoutes, leagueRoutes, draftingRoutes, leaderboardRoutes, petRoutes, adminRoutes, wordlistRoutes;

try {
  authRoutes = require('./backend/routes/auth');
  console.log('✔ Auth routes loaded');
} catch (e) {
  console.error('✗ Failed to load auth routes:', e.message);
}

try {
  leagueRoutes = require('./backend/routes/leagues');
  console.log('✔ League routes loaded');
} catch (e) {
  console.error('✗ Failed to load league routes:', e.message);
}

try {
  draftingRoutes = require('./backend/routes/drafting');
  console.log('✔ Drafting routes loaded');
} catch (e) {
  console.error('✗ Failed to load drafting routes:', e.message);
}

try {
  leaderboardRoutes = require('./backend/routes/leaderboard');
  console.log('✔ Leaderboard routes loaded');
} catch (e) {
  console.error('✗ Failed to load leaderboard routes:', e.message);
}

try {
  petRoutes = require('./backend/routes/pets');
  console.log('✔ Pet routes loaded');
} catch (e) {
  console.error('✗ Failed to load pet routes:', e.message);
}

try {
  wordlistRoutes = require('./backend/routes/wordlist');
  console.log('✔ Wordlist routes loaded');
} catch (e) {
  console.error('✗ Failed to load wordlist routes:', e.message);
}

// Admin routes for breed management and user/league management
try {
  adminRoutes = require('./backend/routes/admin');
  console.log('✔ Admin routes loaded');
} catch (e) {
  console.error('✗ Failed to load admin routes:', e.message);
}

// ============ REGISTER ROUTES ============

if (authRoutes) app.use('/api/auth', authRoutes);
if (leagueRoutes) app.use('/api/leagues', leagueRoutes);
if (draftingRoutes) app.use('/api/drafting', draftingRoutes);
if (leaderboardRoutes) app.use('/api/leaderboard', leaderboardRoutes);
if (petRoutes) app.use('/api/pets', petRoutes);
if (wordlistRoutes) app.use('/api/wordlist', wordlistRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);

console.log('\n✔ All routes registered:');
console.log('  - /api/auth');
console.log('  - /api/leagues');
console.log('  - /api/drafting');
console.log('  - /api/leaderboard');
console.log('  - /api/pets');
console.log('  - /api/wordlist');
console.log('  - /api/admin');

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

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/league.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'league.html'));
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Fantasy Pet League is running',
    scraperInfo: 'Scraper runs independently via GitHub Actions (2 AM UTC daily)'
  });
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
      'GET /api/leagues/:leagueId/members',
      'GET /api/leagues/available/list'
    ],
    drafting: [
      'POST /api/drafting',
      'GET /api/drafting/:leagueId',
      'DELETE /api/drafting/:petId/:leagueId',
      'GET /api/drafting/league/:leagueId/rosters',
      'GET /api/drafting/league/:leagueId/pets',
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
      'GET /api/admin/users (admin only)',
      'DELETE /api/admin/users/:userId (admin only)',
      'GET /api/admin/leagues (admin only)',
      'DELETE /api/admin/leagues/:leagueId (admin only)'
    ]
  });
});

// ============ 404 HANDLER ============

app.use((req, res) => {
  console.warn(`⚠  404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// ============ ERROR HANDLER ============

app.use((err, req, res, next) => {
  console.error('✗ Server error:', err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============ DISCORD BOT ============

if (process.env.DISCORD_BOT_TOKEN) {
  try {
    const { startBot } = require('./discord-bot');
    startBot();
    console.log('✔ Discord bot started');
  } catch (error) {
    console.warn('⚠  Discord bot not available:', error.message);
  }
}

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🐾 Fantasy Pet League Server Running`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`API Docs: http://localhost:${PORT}/api/endpoints`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`\n📡 Scraper Info:`);
  console.log(`   Runs independently via GitHub Actions`);
  console.log(`   Schedule: Daily at 2 AM UTC`);
  console.log(`   Status: Check scraper_logs table for history`);
  console.log(`${'='.repeat(60)}\n`);
});