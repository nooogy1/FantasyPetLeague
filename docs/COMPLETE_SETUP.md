# Fantasy Pet League - Complete Deployment Guide

## 📋 Overview

This guide covers:
- ✅ PostgreSQL Database setup
- ✅ Node.js Backend API
- ✅ Python Daily Scraper
- ✅ Discord Bot for notifications & commands
- ✅ Admin Dashboard for breed points management
- ✅ Frontend UI
- ✅ Railway deployment

## 🚀 Quick Start (Local)

### 1. Prerequisites
```bash
# Install Node.js 18+
# Install Python 3.11+
# Install PostgreSQL
```

### 2. Clone & Setup
```bash
git clone <your-repo>
cd fantasy-pet-league

# Node dependencies
npm install

# Python dependencies
pip install -r requirements.txt
python -m playwright install chromium
```

### 3. Database Setup
```bash
# Create database
createdb fantasy_pet_league

# Run schema
psql fantasy_pet_league < schema.sql
```

### 4. Environment Variables
Create `.env` file:
```
DATABASE_URL=postgresql://user:password@localhost:5432/fantasy_pet_league
JWT_SECRET=your-super-secret-key-change-this
NODE_ENV=development
PORT=3000
DISCORD_BOT_TOKEN=your_discord_bot_token_here
NOTIFICATIONS_CHANNEL_ID=your_discord_channel_id
ADMIN_ROLE_ID=your_discord_admin_role_id
```

### 5. Create Discord Bot
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Go to "Bot" tab, click "Add Bot"
4. Copy token → paste in `DISCORD_BOT_TOKEN`
5. Under "OAuth2" → "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Manage Messages`
6. Copy generated URL and add bot to your server

### 6. Run Locally
**Terminal 1 - Backend:**
```bash
npm start
# or for development with auto-reload:
npm run dev
```

**Terminal 2 - Scraper (manual test):**
```bash
python daily_scraper.py
```

**Terminal 3 - Access:**
- Frontend: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin-dashboard
- API: http://localhost:3000

## 🌩️ Railway Deployment

### Step 1: Connect GitHub to Railway
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select your repository

### Step 2: Add PostgreSQL
1. Click "Add" in Railway dashboard
2. Select "PostgreSQL"
3. Railway creates `DATABASE_URL` automatically

### Step 3: Configure Backend Service
1. Create service from your GitHub repo
2. Set environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate strong secret>
   DATABASE_URL=<from PostgreSQL plugin>
   DISCORD_BOT_TOKEN=<from Discord>
   NOTIFICATIONS_CHANNEL_ID=<your channel ID>
   ADMIN_ROLE_ID=<your role ID>
   ```
3. Set start command: `npm install && node server.js`
4. Wait for deployment

### Step 4: Initialize Database
Railway CLI or UI terminal:
```bash
psql $DATABASE_URL < schema.sql

# Create first admin user (get the hashed password from bcrypt)
psql $DATABASE_URL -c "UPDATE users SET is_admin = true WHERE first_name = 'Admin'"
```

### Step 5: Deploy Scraper as Cron Job
Create `railway.toml` in repo root:
```toml
[build]
builder = "nixpacks"

[[crons]]
name = "scraper"
command = "python daily_scraper.py"
schedule = "0 2 * * *"  # Daily at 2 AM UTC
```

Or use GitHub Actions for scheduling:

Create `.github/workflows/scraper.yml`:
```yaml
name: Daily Scraper
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          pip install -r requirements.txt
          python -m playwright install chromium
          python daily_scraper.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 🛠️ Admin Dashboard

**Access:** `https://your-app.railway.app/admin-dashboard`

### Features:
- 📊 View statistics (users, pets, points awarded, etc.)
- 🏷️ Manage breed points (edit, delete, create)
- ➕ Auto-populate missing breeds (defaults to 1 point)
- 📋 View scraper logs

### Auto-Populate Breeds:
When new breeds appear in pets table but aren't in breed_points:
1. Go to "New Breeds" tab
2. Click "Auto-Populate Missing Breeds"
3. All breeds default to 1 point
4. Edit individual breeds after

## 🤖 Discord Bot

### Commands:
```
/addpet pet_id:<id> league:<league_name>
  → Draft a pet to your roster

/myroster league:<league_name>
  → View your drafted pets

/leaderboard league:<league_name>
  → View league standings

/setpoints breed:<name> points:<number>
  → Set custom points for a breed (admin only)

/listbreeds
  → View all custom breed points
```

### Notifications:
Bot sends automatic messages to configured channel when:
- 🆕 New pets are added
- 🎉 Someone's drafted pet gets adopted
- 📊 Leaderboard updates

## 📊 Database Queries

### Check scraper logs:
```sql
SELECT * FROM scraper_logs ORDER BY run_date DESC LIMIT 10;
```

### View points awarded:
```sql
SELECT 
  u.first_name,
  l.name,
  p.points_amount,
  p.awarded_at
FROM points p
JOIN users u ON u.id = p.user_id
JOIN leagues l ON l.id = p.league_id
ORDER BY p.awarded_at DESC;
```

### Current leaderboard:
```sql
SELECT 
  u.first_name,
  l.name,
  lc.total_points,
  ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY lc.total_points DESC) as rank
FROM leaderboard_cache lc
JOIN users u ON u.id = lc.user_id
JOIN leagues l ON l.id = lc.league_id
ORDER BY l.name, lc.total_points DESC;
```

### Make user admin:
```sql
UPDATE users SET is_admin = true WHERE first_name = 'John';
```

## 🐛 Troubleshooting

**Scraper not running:**
- Check Railway logs: Dashboard → Logs
- Verify `DATABASE_URL` is set
- Test locally: `python daily_scraper.py`

**Admin dashboard 401 error:**
- Verify JWT_SECRET matches between frontend and backend
- Check browser console for token errors
- Clear browser cache and re-login

**Discord bot not responding:**
- Check bot has correct permissions in server
- Verify DISCORD_BOT_TOKEN is correct
- Restart bot: redeploy service

**Pets not appearing:**
- Run scraper manually: `python daily_scraper.py`
- Check `SELECT COUNT(*) FROM pets;`
- Verify URLs in scraper (adoptables vs fosters)

**Database connection failed:**
- Test connection: `psql $DATABASE_URL -c "SELECT 1;"`
- Check PostgreSQL is running
- Verify DATABASE_URL format

## 📦 File Structure

```
fantasy-pet-league/
├── server.js                    # Main Express API
├── admin-dashboard.js           # Admin routes
├── admin.html                   # Admin UI
├── index.html                   # Main frontend
├── discord-bot.js               # Discord bot
├── daily_scraper.py            # Python scraper
├── breed_points.py             # Breed points utility
├── schema.sql                  # Database schema
├── package.json                # Node dependencies
├── requirements.txt            # Python dependencies
├── railway.toml               # Railway config
├── .env                        # Environment variables
└── README.md
```

## 🎯 Next Steps

1. **Set up custom domain** - Point DNS to Railway URL
2. **Add email notifications** - For point awards
3. **Create team leaderboards** - Group vs individual scoring
4. **Add pet wish lists** - Users can favorite pets before drafting
5. **Multi-shelter support** - Add other BARC locations

## 📝 API Endpoints

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login

### Leagues
- `GET /leagues` - List leagues (auth required)
- `POST /leagues` - Create league (auth required)

### Drafting
- `POST /draft` - Draft pet (auth required)
- `GET /myroster/:leagueId` - View roster (auth required)
- `DELETE /draft/:petId/:leagueId` - Undraft pet (auth required)

### Leaderboard
- `GET /leaderboard/:leagueId` - View standings

### Pets
- `GET /pets?type=dogs&status=available&source=adoptables` - List pets

### Admin
- `GET /admin/stats` - Statistics (admin only)
- `GET /admin/breeds` - List breed points (admin only)
- `POST /admin/breeds` - Create breed point (admin only)
- `PUT /admin/breeds/:id` - Update breed point (admin only)
- `DELETE /admin/breeds/:id` - Delete breed point (admin only)
- `POST /admin/breeds/auto-populate` - Auto-populate breeds (admin only)
- `GET /admin/scraper-logs` - Scraper logs (admin only)

## 🔐 Security Notes

- Passphrases hashed with bcrypt
- JWT tokens expire in 7 days
- Admin routes check `is_admin` flag
- Discord commands validated against user role
- Rate limiting recommended for production
- Use HTTPS in production

Enjoy your Fantasy Pet League! 🐾
