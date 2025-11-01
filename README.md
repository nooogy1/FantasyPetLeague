# Fantasy Pet League 🐾

A gamified pet adoption fantasy league where users draft pets, earn points when pets get adopted, and compete on leaderboards.

## 🎮 Features

- **📝 Passphrase Authentication** - Sign up with memorable passphrases (format: adverb + adjective + breed)
- **🏆 Leagues & Drafting** - Create leagues, invite friends, draft adoptable pets
- **🤖 Discord Integration** - Commands for drafting, viewing roster, checking leaderboard
- **📊 Live Leaderboard** - Automatic updates as pets get adopted
- **⚙️ Admin Dashboard** - Manage breed-based point values, view statistics
- **🔄 Daily Scraper** - Automatically detects pet adoptions from BARC shelter
- **🐾 Multi-shelter** - Currently supports BARC adoptables and fosters lists

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL |
| **Frontend** | HTML/CSS/JavaScript |
| **Scraper** | Python + Playwright |
| **Discord Bot** | Discord.js |
| **Hosting** | Railway |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL
- Discord account

### Local Setup

1. **Clone & Install**
```bash
git clone https://github.com/yourusername/fantasy-pet-league.git
cd fantasy-pet-league

npm install
pip install -r scraper/requirements.txt
python -m playwright install chromium
```

2. **Setup Database**
```bash
createdb fantasy_pet_league
psql fantasy_pet_league < database/schema.sql
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Run Services**
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Scraper (manual test)
python scraper/daily_scraper.py

# Visit http://localhost:3000
```

## 📋 Project Structure

```
fantasy-pet-league/
├── backend/              # Node.js Express API
├── frontend/             # HTML/CSS/JavaScript UI
├── scraper/              # Python daily scraper
├── database/             # PostgreSQL schema
├── config/               # Configuration files
├── docs/                 # Documentation
└── .github/workflows/    # GitHub Actions
```

## 🌩️ Deployment

### Deploy to Railway

1. Connect GitHub repo to Railway
2. Add PostgreSQL plugin
3. Set environment variables
4. Initialize database: `psql $DATABASE_URL < database/schema.sql`

See [docs/COMPLETE_SETUP.md](docs/COMPLETE_SETUP.md) for detailed instructions.

## 🤖 Discord Bot

### Commands
```
/addpet pet_id:<id> league:<name>  - Draft a pet
/myroster league:<name>            - View your roster
/leaderboard league:<name>         - See standings
/setpoints breed:<name> points:<#>  - Adjust breed value (admin only)
/listbreeds                        - View breed points
```

### Setup
1. Create Discord application
2. Add bot token to `.env`
3. Set notification channel ID
4. Invite bot to your server

See [docs/DISCORD_BOT.md](docs/DISCORD_BOT.md)

## ⚙️ Admin Dashboard

Access at `/admin-dashboard` (admin users only)

- 📊 View statistics and scraper logs
- 🏷️ Manage breed point values
- ➕ Auto-populate new breeds (defaults to 1 point)
- 🔄 Track adoption history

See [docs/ADMIN_DASHBOARD.md](docs/ADMIN_DASHBOARD.md)

## 🐕 How It Works

1. **User creates/joins league** - Form a group to compete
2. **Draft available pets** - Choose from adoptable & foster lists
3. **Daily scraper runs** - Checks if any drafted pets were adopted
4. **Points awarded** - Users earn breed-specific points when pets adopt
5. **Leaderboard updates** - Rankings automatically update
6. **Discord notifications** - Get notified of adoptions & point awards

## 📊 Database Schema

Key tables:
- **users** - Player accounts
- **leagues** - Leagues created by users
- **pets** - All available and adopted pets from BARC
- **roster_entries** - What pets each user has drafted
- **points** - Historical record of points awarded
- **breed_points** - Customizable point values per breed
- **leaderboard_cache** - Performance cache for rankings

See [database/schema.sql](database/schema.sql)

## 📚 Documentation

- [Complete Setup Guide](docs/COMPLETE_SETUP.md) - Local & Railway deployment
- [API Documentation](docs/API.md) - All backend endpoints
- [Discord Bot Guide](docs/DISCORD_BOT.md) - Bot commands & setup
- [Admin Dashboard](docs/ADMIN_DASHBOARD.md) - Admin features
- [Scraper Setup](docs/SCRAPER_SETUP.md) - Scraper configuration

## 🔐 Security

- Passphrases hashed with bcrypt
- JWT tokens (7-day expiration)
- Admin-only dashboard routes
- Discord role validation
- Environment variables for secrets
- HTTPS recommended for production

## 🐛 Troubleshooting

**Scraper not running?**
```bash
python scraper/daily_scraper.py  # Test manually
```

**Discord bot offline?**
- Check DISCORD_BOT_TOKEN in .env
- Verify bot has permissions in server

**Admin dashboard 401?**
- Ensure JWT_SECRET is set correctly
- Check browser console for errors

See [docs/COMPLETE_SETUP.md](docs/COMPLETE_SETUP.md) for more troubleshooting.

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙋 Support

Have questions? Open an issue or start a discussion in GitHub!

## 🎯 Roadmap

- [ ] Multi-shelter support (beyond BARC)
- [ ] Email notifications
- [ ] Team leaderboards
- [ ] Pet wish lists
- [ ] Adoption statistics & graphs
- [ ] Mobile app
- [ ] API for third-party integrations

---

**Made with 🐾 for pet lovers**
