# Fantasy Pet League - Scraper Setup

## Database Setup

1. Create a PostgreSQL database:
```bash
createdb fantasy_pet_league
```

2. Run the schema:
```bash
psql fantasy_pet_league < schema.sql
```

## Environment Variables

Create a `.env` file:
```
DATABASE_URL=postgresql://user:password@localhost:5432/fantasy_pet_league
```

## Installation

```bash
pip install psycopg2-binary python-dotenv playwright
playwright install chromium
```

## Usage

### Run the daily scraper once:
```bash
python daily_scraper.py
```

This will:
- Scrape both BARC adoptables and fosters
- Insert new pets
- Detect adopted pets (removed from both lists)
- Award points to users who drafted adopted pets
- Update leaderboard cache

### Manage breed points:

```bash
# List all breed points
python breed_points.py list

# Initialize all breeds with default 1 point
python breed_points.py init

# Set custom points for a breed
python breed_points.py set "Staffordshire Bull Terrier mix" 2
python breed_points.py set "German Shepherd Dog mix" 1
```

## Schedule Daily Runs

### Using Railway Cron Job:
Add to your `railway.toml`:
```toml
[crons]
scraper = "python daily_scraper.py"
schedule = "0 2 * * *"  # Daily at 2 AM UTC
```

### Using system cron (local):
```bash
crontab -e
```

Add:
```
# Run scraper daily at 2 AM
0 2 * * * cd /path/to/project && python daily_scraper.py >> logs/scraper.log 2>&1
```

### Using GitHub Actions:
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
      - run: pip install -r requirements.txt
      - run: python daily_scraper.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Database Schema

### pets table
- **pet_id**: External ID (e.g., A2043899)
- **name**: Pet name
- **breed**: Breed (used for point calculation)
- **animal_type**: Dog, Cat, etc
- **source**: 'adoptables' or 'fosters'
- **status**: 'available' or 'removed' (adopted)
- **first_seen**: Date pet first appeared
- **last_seen**: Last date pet was on the list

### roster_entries table
- Links users to drafted pets within leagues
- When pet is adopted, user earns points

### points table
- Historical record of points awarded
- Points awarded when pet status changes to 'removed'

### breed_points table
- Configurable points per breed (default 1)
- Use `breed_points.py` to manage

## How it works

1. **Scraper runs daily**
   - Fetches current pets from both sources
   - Compares against database

2. **New pets detected**
   - Inserted into `pets` table with status='available'
   - Users can now draft them

3. **Removed pets detected**
   - Pet no longer appears on either list
   - Status changed to 'removed' (adoption assumed)
   - All users who drafted it in any league get points
   - Points = breed_points[breed] (default 1)

4. **Leaderboard updated**
   - `leaderboard_cache` aggregates points per user per league
   - Used for fast frontend queries

## Monitoring

Check scraper logs:
```sql
SELECT * FROM scraper_logs ORDER BY run_date DESC LIMIT 10;
```

Check recent point awards:
```sql
SELECT 
  u.first_name, 
  l.name as league,
  p.pet_id,
  p.points_amount,
  p.awarded_at
FROM points p
JOIN users u ON u.id = p.user_id
JOIN leagues l ON l.id = p.league_id
ORDER BY p.awarded_at DESC
LIMIT 20;
```

View current standings:
```sql
SELECT 
  u.first_name,
  l.name as league,
  lc.total_points,
  ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY lc.total_points DESC) as rank
FROM leaderboard_cache lc
JOIN users u ON u.id = lc.user_id
JOIN leagues l ON l.id = lc.league_id
ORDER BY l.name, lc.total_points DESC;
```
