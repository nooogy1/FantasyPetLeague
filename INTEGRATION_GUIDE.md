# Integration Guide - Connecting Modular Routes

## 🔗 Overview

This guide explains how to integrate the new modular route files into your existing `server.js` file. This refactoring improves code organization and maintainability.

---

## 📝 Updated server.js

Replace your current `server.js` with this version that uses the modular routes:

```javascript
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

---

## 📂 File Organization

After integration, your project structure looks like:

```
fantasy-pet-league/
├── server.js                    # Main server (routes registered here)
├── admin-dashboard.js           # Admin routes
├── admin.html                   # Admin UI
├── index.html                   # Main UI
├── discord-bot.js              # Discord bot
├── package.json
├── schema.sql
├── backend/
│   └── routes/
│       ├── auth.js             # Authentication
│       ├── leagues.js          # League management
│       ├── drafting.js         # Pet drafting
│       ├── leaderboard.js      # Leaderboard
│       └── pets.js             # Pet listing
├── frontend/
│   ├── css/
│   │   └── style.css           # Styles
│   ├── js/
│   │   ├── app.js              # Main app logic
│   │   └── admin-app.js        # Admin logic
└── ... (other files)
```

---

## 🔄 API Endpoints Now Available

After integration, all these endpoints are active:

### Authentication
```
POST   /auth/signup
POST   /auth/login
```

### Leagues
```
POST   /leagues
GET    /leagues
GET    /leagues/:leagueId
PUT    /leagues/:leagueId
DELETE /leagues/:leagueId
GET    /leagues/:leagueId/members
```

### Drafting
```
POST   /draft
GET    /draft/league/:leagueId
DELETE /draft/:petId/:leagueId
GET    /draft/league/:leagueId/rosters
GET    /draft/history/:leagueId
```

### Leaderboard
```
GET    /leaderboard/:leagueId
GET    /leaderboard/
GET    /leaderboard/user/:userId/league/:leagueId
GET    /leaderboard/user/:userId
GET    /leaderboard/top/alltime
POST   /leaderboard/refresh
GET    /leaderboard/stats/:leagueId
```

### Pets
```
GET    /pets
GET    /pets/id/:petId
GET    /pets/count/available
GET    /pets/type/:animalType
GET    /pets/breed/:breed
GET    /pets/adopted/recent
GET    /pets/new/today
GET    /pets/stats/overview
GET    /pets/stats/popular-breeds
GET    /pets/stats/draft-popularity
```

### Admin
```
GET    /admin/stats
GET    /admin/breeds
GET    /admin/breeds/missing
POST   /admin/breeds/auto-populate
POST   /admin/breeds
PUT    /admin/breeds/:breedId
DELETE /admin/breeds/:breedId
GET    /admin/scraper-logs
GET    /admin-dashboard
```

---

## 🎨 Frontend Integration

### In HTML Files (index.html, etc.)

Add CSS and JS at the bottom of your body:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Fantasy Pet League</title>
  <!-- Link the consolidated CSS -->
  <link rel="stylesheet" href="/frontend/css/style.css">
</head>
<body data-page="dashboard">
  <!-- Your HTML content -->
  
  <!-- Link the main app JavaScript -->
  <script src="/frontend/js/app.js"></script>
  
  <!-- Use app functions -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      app.checkAuth();
      app.loadLeagues();
    });
  </script>
</body>
</html>
```

### In admin.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>Admin Dashboard</title>
  <link rel="stylesheet" href="/frontend/css/style.css">
</head>
<body data-page="admin">
  <!-- Your admin content -->
  
  <script src="/frontend/js/admin-app.js"></script>
  
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      admin.loadStatistics();
      admin.loadBreedPoints();
    });
  </script>
</body>
</html>
```

---

## 🧪 Testing Integration

### 1. Test Backend Routes

```bash
# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"quickly violet corgi","firstName":"John"}'

# List leagues
curl -X GET http://localhost:3000/leagues \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get pets
curl -X GET "http://localhost:3000/pets?type=dogs&status=available"

# Check health
curl http://localhost:3000/health
```

### 2. Test Frontend

```bash
# Start server
npm run dev

# Visit pages
# http://localhost:3000/index.html
# http://localhost:3000/admin-dashboard
```

### 3. Test Admin Panel

1. Visit `/admin-dashboard`
2. Login with your account
3. Should see statistics and breed management tabs
4. Test creating/updating/deleting breeds

---

## 🔐 Authentication Flow

The modular routes maintain the same JWT-based authentication:

1. User signs up/logs in via `/auth` routes
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. Frontend includes token in `Authorization: Bearer <token>` header
5. Routes verify token before allowing access

**Token expiration:** 7 days

---

## 📊 Middleware in Each Route

Each route module has its own `authenticateToken` middleware:

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

Use it on protected routes:
```javascript
router.get('/protected', authenticateToken, async (req, res) => {
  // User is authenticated here
  const userId = req.user.userId;
});
```

---

## 🐛 Troubleshooting Integration

### Routes returning 404

**Problem:** Endpoints return 404 Not Found

**Solution:**
1. Check server.js has all route imports
2. Verify route paths match API documentation
3. Check `app.use()` order (specific routes before generic)
4. Restart server after changes

### Authorization errors (401/403)

**Problem:** Getting 401 or 403 errors

**Solution:**
1. Verify JWT_SECRET matches between server and routes
2. Check token is being sent in header
3. Verify token hasn't expired (7 days)
4. Check `is_admin` flag for admin routes

### CORS errors

**Problem:** Frontend can't reach backend

**Solution:**
1. Verify `cors()` middleware is in server.js
2. Check API_BASE in frontend JS points to correct server
3. Ensure localhost:3000 isn't being blocked

### Missing dependencies

**Problem:** `require()` errors for route files

**Solution:**
```bash
# Make sure all packages are installed
npm install express pg bcrypt jsonwebtoken cors dotenv discord.js

# Check package.json has all dependencies
npm list
```

---

## 📈 Performance Optimization

### Database Connection Pool

The routes share a single database connection pool:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Pool settings (recommended):**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Optimization

Routes use parameterized queries to prevent SQL injection:

```javascript
// Safe (prevents SQL injection)
await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Unsafe (don't do this)
await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```

---

## 🚀 Deployment Checklist

- [ ] All route files created in `backend/routes/`
- [ ] `server.js` updated with modular route imports
- [ ] Frontend CSS linked in HTML files
- [ ] Frontend JS files linked in HTML files
- [ ] Environment variables set in `.env`
- [ ] Database initialized with `schema.sql`
- [ ] Test all endpoints locally
- [ ] Deploy to Railway/server
- [ ] Discord bot configured (if using)
- [ ] GitHub Actions workflow set up (if using)

---

## 📚 Related Documentation

- [API Documentation](docs/API.md)
- [Complete Setup Guide](COMPLETE_SETUP.md)
- [Railway Deployment](RAILWAY_DEPLOY.md)
- [Discord Bot Guide](docs/DISCORD_BOT.md)
- [Admin Dashboard Guide](docs/ADMIN_DASHBOARD.md)

---

## ✅ Integration Complete!

You now have:
- ✅ Modular, organized backend routes
- ✅ Professional frontend styling
- ✅ All API endpoints functional
- ✅ Admin management tools
- ✅ Complete documentation
- ✅ Ready for production deployment

Your Fantasy Pet League is ready to launch! 🚀
