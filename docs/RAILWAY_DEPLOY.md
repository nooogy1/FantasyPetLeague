# Fantasy Pet League - Railway Deployment Guide

## Step 1: Create Railway Account & Project

1. Go to https://railway.app
2. Sign up with GitHub
3. Create a new project
4. Connect your GitHub repository

## Step 2: Add PostgreSQL Plugin

1. In Railway dashboard, click "Add"
2. Select "PostgreSQL"
3. Railway will create a `DATABASE_URL` environment variable

## Step 3: Configure Services

### Service 1: Backend API (Node.js)

1. Create a new service from your GitHub repo
2. Set environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secret-key-here
   DATABASE_URL=<copied from PostgreSQL plugin>
   PORT=3000
   ```

3. Set start command:
   ```
   npm install && node server.js
   ```

### Service 2: Database Initialization

Create a one-time migration job:

1. Add a new "Run" service
2. Use this command:
   ```
   psql $DATABASE_URL < schema.sql
   ```

### Service 3: Daily Scraper (Cron Job)

1. Create `railroad.toml` in your repo root:

```toml
[[services]]
name = "scraper"
dockerfile = "Dockerfile.scraper"
crons = [
  { command = "python daily_scraper.py", schedule = "0 2 * * *" }
]
```

2. Create `Dockerfile.scraper`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libwebp6 \
    libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m playwright install chromium

COPY daily_scraper.py .
COPY breed_points.py .

CMD ["python", "daily_scraper.py"]
```

## Step 4: Environment Variables

In Railway dashboard, add these variables:

```
DATABASE_URL=postgresql://...  (auto from PostgreSQL plugin)
JWT_SECRET=your-very-secure-random-key
NODE_ENV=production
PORT=3000
```

## Step 5: Run Database Schema

Once PostgreSQL is running:

1. In Railway CLI or dashboard terminal:
   ```bash
   psql $DATABASE_URL < schema.sql
   ```

2. Initialize breed points:
   ```bash
   python breed_points.py init
   ```

## Step 6: Deploy

1. Push to GitHub
2. Railway auto-deploys on push
3. Check deployment status in Railway dashboard

## Step 7: Access Your App

- Backend API: `https://your-project.railway.app`
- Frontend: `https://your-project.railway.app/index.html` (if serving static files)

## Testing Locally

### Setup

```bash
# Install Node dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
python -m playwright install chromium

# Create .env file
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/fantasy_pet" > .env
echo "JWT_SECRET=dev-secret" >> .env
```

### Start local Postgres

```bash
brew install postgresql  # macOS
# or
sudo apt install postgresql  # Linux

createdb fantasy_pet
psql fantasy_pet < schema.sql
```

### Run services

**Terminal 1 - Backend:**
```bash
npm install
node server.js
```

**Terminal 2 - Scraper (manual test):**
```bash
python daily_scraper.py
```

**Terminal 3 - Frontend:**
```bash
# Serve index.html via simple Python server
python -m http.server 8000
# Visit http://localhost:8000
```

## Database Queries

### Check scraper logs
```sql
SELECT * FROM scraper_logs ORDER BY run_date DESC LIMIT 10;
```

### Check points awarded
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

### View leaderboard
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

## Troubleshooting

**Scraper not running:**
- Check Railway logs: `railway logs scraper`
- Verify DATABASE_URL is set correctly
- Test locally: `python daily_scraper.py`

**API returning 401:**
- Check JWT_SECRET matches between backend and frontend
- Verify token is being sent in Authorization header

**Pets not appearing:**
- Run: `SELECT COUNT(*) FROM pets;`
- Check scraper logs for errors
- Verify Playwright is working: `python -c "from playwright.sync_api import sync_playwright; print('OK')"`

**Database connection failed:**
- Verify DATABASE_URL format
- Check PostgreSQL plugin is running in Railway
- Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

## Next Steps

1. **Add Discord bot** for notifications
2. **Custom domain** - Point to Railway app
3. **Email notifications** for point awards
4. **Analytics** - Track most popular breeds
5. **Multi-league support** - Done! Users can join multiple leagues
