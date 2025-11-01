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
app.use(express.static(path.join(__dirname))); // Serve static files

// ============ IMPORT ROUTE MODULES ============

const authRoutes = require('./backend/routes/auth');
const leagueRoutes = require('./backend/routes/leagues');
const draftingRoutes = require('./backend/routes/drafting');
const leaderboardRoutes = require('./backend/routes/leaderboard');
const petRoutes = require('./backend/routes/pets');
const adminRoutes = require('./admin-dashboard');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// ============ ROUTES ============

// Use modular route handlers
app.use('/auth', authRoutes);
app.use('/leagues', leagueRoutes);
app.use('/draft', draftingRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/pets', petRoutes);
app.use('/admin', adminRoutes);

// Serve admin dashboard
app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============ 404 HANDLER ============

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============ ERROR HANDLER ============

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============ DISCORD BOT ============

// Optional: Start Discord bot if token is provided
if (process.env.DISCORD_BOT_TOKEN) {
  try {
    const { startBot } = require('./discord-bot');
    startBot();
  } catch (error) {
    console.warn('Discord bot not available:', error.message);
  }
}

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin-dashboard`);
});
```