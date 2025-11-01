# Fantasy Pet League - Admin Dashboard Documentation

## 📊 Overview

The Admin Dashboard is a web interface for managing breed points, viewing system statistics, and monitoring scraper activity. Access it at `/admin-dashboard` after logging in with admin privileges.

**URL:** `http://localhost:3000/admin-dashboard` (local) or `https://your-app.railway.app/admin-dashboard` (production)

---

## 🔐 Login & Access

### Requirements
- Valid account on the Fantasy Pet League website
- Admin flag set in database: `is_admin = true`

### Making a User Admin

**Option 1: Direct SQL (Database)**
```sql
UPDATE users SET is_admin = true WHERE first_name = 'John';
```

**Option 2: During Initial Setup**
The first admin user is created during database initialization. Update their passphrase hash after creation.

### Login Flow
1. Visit `/admin-dashboard`
2. You'll be redirected to login if not authenticated
3. Enter your passphrase
4. JWT token stored in browser
5. Access granted to admin features

---

## 📈 Statistics Dashboard

### System Overview
Shows high-level metrics about the entire system:

```
Total Users:              42
Total Leagues:            8
Available Pets:           156
Adopted Pets:             89
Total Drafts:             234
Total Points Awarded:     312
Breeds Configured:        47
```

**What each metric means:**
- **Total Users** - Active accounts created
- **Total Leagues** - Leagues created across all users
- **Available Pets** - Pets currently on BARC lists
- **Adopted Pets** - Pets removed (assumed adopted)
- **Total Drafts** - Total pets drafted across all leagues
- **Total Points Awarded** - Cumulative points from adoptions
- **Breeds Configured** - Custom breed point entries

**Use cases:**
- Track platform growth
- Monitor system health
- Identify adoption trends

---

## 🐾 Breed Points Management

### View All Breeds

**Breed Points Table** shows:
- **Breed Name** - Dog/cat breed
- **Points** - Points awarded when pet adopted
- **Pet Count** - How many pets of this breed exist
- **Updated At** - Last modification date

**Columns:**
```
Breed                          | Points | Pet Count | Last Updated
German Shepherd Dog mix        | 2      | 12        | 2024-01-15
Labrador Retriever mix         | 1      | 8         | 2024-01-14
Staffordshire Bull Terrier mix | 3      | 5         | 2024-01-15
Domestic Shorthair             | 1      | 23        | 2024-01-14
```

**Sorting:**
- Default: sorted by points (highest first), then alphabetically
- Points determine reward value

---

### Update Breed Points

**To increase points for a breed:**
1. Find breed in table
2. Click edit icon or click breed name
3. Enter new point value
4. Click "Save"
5. Confirmation appears
6. New value takes effect immediately

**Example:**
- Change "Staffordshire Bull Terrier mix" from 2 to 3 points
- Next time this breed is adopted, users get 3 points instead of 2
- Only affects future adoptions (past points unchanged)

**Constraints:**
- Minimum: 1 point
- Maximum: no limit (recommendation: keep under 10)
- Must be integer value

---

### Create New Breed Entry

**To add a breed not yet in the system:**
1. Click "Add New Breed"
2. Enter breed name exactly as it appears in scraper data
3. Enter point value
4. Click "Create"
5. Breed added to system

**Breed name examples:**
- "Staffordshire Bull Terrier mix"
- "Domestic Shorthair"
- "Mixed Breed"
- "German Shepherd Dog"

**Best practices:**
- Use exact names from BARC
- Check existing breeds before creating duplicates
- Breeds are case-sensitive

---

### Delete Breed Entry

**To remove a breed:**
1. Find breed in table
2. Click delete icon (trash can)
3. Confirm deletion
4. Breed removed from system

**Note:** This doesn't affect:
- Existing pets with this breed
- Past points awarded
- Only removes from breed_points table

---

### Auto-Populate Missing Breeds

**When scraper finds new breeds** that aren't in the breed_points table, you can auto-populate them:

1. Go to "Missing Breeds" section
2. View breeds found in pets but not in breed_points
3. Click "Auto-Populate Missing Breeds"
4. All missing breeds added with default 1 point
5. View results: "Successfully added 5 breeds"

**What it does:**
- Scans pets table for unique breeds
- Finds breeds missing from breed_points
- Inserts with 1 point each
- Safe to run multiple times (won't duplicate)

**When to use:**
- After first scraper run
- When many new breeds appear
- After importing new pet data

---

## 📋 New Breeds Tab

Shows breeds that exist in the pets table but don't have custom point values.

**Table displays:**
- **Breed Name** - Name from pets table
- **Pet Count** - How many pets have this breed
- **Action** - Add to breed_points or skip

**Options:**
1. **Add Individual Breed** - Set custom points for one breed
2. **Auto-Populate All** - Add all missing breeds with default 1 point
3. **Skip** - Do nothing

**Example workflow:**
1. Scraper finds 5 new breeds
2. "New Breeds" shows: Mixed Breed (15), Tabby mix (3), etc.
3. Review popularity
4. Click "Auto-Populate" to add all with 1 point
5. Then edit high-volume breeds to higher points

---

## 📊 Scraper Logs

View logs from recent scraper runs for debugging and monitoring.

**Log Entries show:**
- **Run Date** - When scraper ran (UTC)
- **Source** - "combined" (both adoptables and fosters)
- **Pets Found** - Total pets scanned
- **New Pets** - Newly added to system
- **Removed Pets** - Detected as adopted
- **Points Awarded** - Total points given to users
- **Error** - Any errors that occurred (if blank, run was successful)

**Example log:**
```
2024-01-15 02:00:00 UTC
Source: combined
Pets Found: 189
New Pets: 12
Removed Pets: 3
Points Awarded: 5
Error: (none)
```

**Troubleshooting with logs:**
- **No entries** - Scraper hasn't run yet, check schedule
- **High removed count** - Many pets adopted that day
- **Error messages** - Check database connectivity, Playwright issues
- **Low pets found** - BARC lists might be loading slowly

---

## 🔄 Automatic Leaderboard Updates

Admin dashboard doesn't manually update leaderboards. Automatic updates happen when:
1. Scraper detects adopted pets
2. Points are awarded to users
3. `leaderboard_cache` table is updated
4. Frontend queries show latest standings

**Check current standings:**
- Visit any league's leaderboard page
- Standings update within 1 minute of adoption

---

## 🛡️ Security Features

### Authentication
- JWT token required to access dashboard
- Token stored in browser localStorage
- Tokens expire after 7 days
- Session automatically logged out on expiration

### Authorization
- Only users with `is_admin = true` can access
- 403 error if admin flag not set
- API enforces admin check on every request
- Can't edit other users' data

### Data Validation
- Breed names validated for special characters
- Points values validated (must be >= 1)
- Database constraints prevent invalid data

---

## ⚙️ Advanced Features

### Batch Operations
Admin dashboard supports single-item operations. For bulk changes:
1. Use SQL directly: `UPDATE breed_points SET points = 1 WHERE points < 1;`
2. Export data, modify in spreadsheet, re-import via API
3. Create custom admin tools as needed

### Exporting Data
Currently no built-in export. To backup:
1. Use PostgreSQL tools: `pg_dump $DATABASE_URL > backup.sql`
2. Export via SQL query results to CSV
3. Use psql to query and pipe to file

### Monitoring
**Regular admin checks:**
- Review scraper logs daily (or weekly)
- Check for high removal counts (adoption spikes)
- Monitor new breeds appearing
- Verify breed point distributions are fair

---

## 📱 Dashboard Layout

```
┌─ Admin Dashboard ────────────────────────┐
├─ Navigation (Left Sidebar)
│  ├─ Dashboard (Overview)
│  ├─ Breed Points (Management)
│  ├─ New Breeds (Auto-populate)
│  └─ Scraper Logs (Monitoring)
├─ Main Content Area
│  ├─ Statistics Cards (Top)
│  ├─ Data Table (Center)
│  └─ Pagination/Sorting
└─ Footer
   ├─ Last Updated: ...
   ├─ Help & Docs
   └─ Logout
```

---

## 🔧 Troubleshooting

### "Admin access required" error
- User doesn't have admin role
- Check database: `SELECT is_admin FROM users WHERE id = '...';`
- Update with SQL: `UPDATE users SET is_admin = true WHERE id = '...';`

### Dashboard won't load
- Check JWT token valid: Open DevTools → Application → LocalStorage → Check token
- Try logging out and back in
- Check browser console for errors
- Verify backend is running

### Can't update breed points
- Check admin flag is set
- Verify breed exists (might need to create first)
- Check no special characters in breed name
- Check points value is >= 1

### Scraper logs empty
- Scraper hasn't run yet (scheduled for 2 AM UTC)
- Check Railway logs if deployed
- Run manually: `python daily_scraper.py`
- Check DATABASE_URL is set correctly

### Stats numbers seem wrong
- Numbers are as of dashboard load time
- Refresh page to get latest
- Check scraper ran recently
- Verify database has data: `SELECT COUNT(*) FROM pets;`

---

## 📚 Related Documentation

- [Complete Setup Guide](../COMPLETE_SETUP.md)
- [API Documentation](API.md)
- [Discord Bot Commands](DISCORD_BOT.md)
- [Scraper Setup](../SCRAPER_SETUP.md)
