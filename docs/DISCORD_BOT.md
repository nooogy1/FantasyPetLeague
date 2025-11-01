# Fantasy Pet League - Discord Bot Documentation

## 🤖 Overview

The Fantasy Pet League Discord bot integrates your league directly into Discord with commands for drafting, viewing rosters, checking leaderboards, and managing breed points.

## ⚙️ Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Fantasy Pet League"
4. Go to "Bot" tab, click "Add Bot"
5. Copy the token and add to `.env`:
   ```
   DISCORD_BOT_TOKEN=your_token_here
   ```

### 2. Set Bot Permissions

Under OAuth2 → URL Generator:
- **Scopes:** `bot`, `applications.commands`
- **Permissions:**
  - Send Messages
  - Embed Links
  - Manage Messages
  - Read Message History

### 3. Generate Invite Link

Copy the generated OAuth2 URL and use it to invite the bot to your server.

### 4. Configure Channels & Roles

In `.env`:
```
NOTIFICATIONS_CHANNEL_ID=your_channel_id
ADMIN_ROLE_ID=your_admin_role_id
```

To get IDs:
1. Enable Developer Mode in Discord
2. Right-click channel/role and select "Copy ID"

---

## 📋 Commands

### 🎮 User Commands

#### `/addpet pet_id:<id> league:<league_name>`
Draft a pet to your roster.

**Usage:**
```
/addpet pet_id:A2043899 league:Houston Pet Lovers
```

**What happens:**
- Pet is added to your roster in the specified league
- You'll get a confirmation embed
- Earn points when this pet gets adopted

**Examples:**
```
/addpet pet_id:A2043900 league:Austin Dog League
/addpet pet_id:C1234567 league:Texas Cat Lovers
```

**Errors:**
- "You need to sign up first!" - Visit website and create account
- "League not found!" - Check league name spelling
- "Pet not found or already adopted!" - Pet ID is invalid or already adopted
- "You've already drafted this pet in this league!" - Duplicate draft attempt

---

#### `/myroster league:<league_name>`
View all pets you've drafted in a league.

**Usage:**
```
/myroster league:Houston Pet Lovers
```

**Response shows:**
- All pets in your roster
- Pet breed and type
- Current status (available or removed/adopted)
- Draft date for each pet

**Examples:**
```
/myroster league:Austin Dog League
/myroster league:Texas Cat Lovers
```

**Errors:**
- "You need to sign up first!" - Create account first
- "League not found!" - Check league name
- "No pets in this league!" - You haven't drafted any pets yet

---

#### `/leaderboard league:<league_name>`
View league standings and rankings.

**Usage:**
```
/leaderboard league:Houston Pet Lovers
```

**Response shows:**
- Top 10 players
- Rank #1, #2, #3, etc.
- Player names and points
- Player cities (if available)

**Examples:**
```
/leaderboard league:Austin Dog League
/leaderboard league:Texas Cat Lovers
```

**Notes:**
- Updated in real-time as pets are adopted
- Shows top 10 (can be extended in config)
- Rankings are per-league

---

#### `/listbreeds`
View all custom breed points.

**Usage:**
```
/listbreeds
```

**Response shows:**
- All breeds and their point values
- Sorted by points (highest first)
- Split into pages if many breeds

**Examples:**
- Staffordshire Bull Terrier mix: 3 points
- German Shepherd Dog mix: 2 points
- Domestic Shorthair: 1 point

**Notes:**
- Points determine reward when pet is adopted
- Breeds default to 1 point if not configured

---

### 🔑 Admin Commands

#### `/setpoints breed:<name> points:<number>`
Set custom point value for a breed.

**Usage:**
```
/setpoints breed:Staffordshire Bull Terrier mix points:3
/setpoints breed:German Shepherd Dog mix points:2
```

**Requirements:**
- Must have the admin role configured in `.env`

**What happens:**
- Breed is created or updated with new point value
- All future adoptions of this breed award the new value
- Confirmation embed is sent

**Examples:**
```
/setpoints breed:Pitbull mix points:5
/setpoints breed:Tabby mix points:2
```

**Notes:**
- Changes apply immediately
- Affects future adoption point awards only
- Can be updated anytime

---

## 🔔 Notifications

Bot automatically sends messages to configured notification channel:

### New Pets Available
Sent when scraper finds new pets:
```
🐆 New Pets Available!
5 new pets added to the league

Buddy (German Shepherd Dog mix) • Dog
Bella (Labrador Retriever mix) • Dog
Max (Golden Retriever mix) • Dog
... and 2 more
```

### Pet Adopted
Sent when a drafted pet is adopted:
```
🎉 Pet Adopted!
Someone's drafted pet just got adopted!

John +2 points for Buddy
Sarah +1 point for Bella
```

### Leaderboard Update
Sent after adoption points are awarded:
```
📊 Leaderboard Update - Houston Pet Lovers
🥇 #1 John: 15 points
🥈 #2 Sarah: 12 points
🥉 #3 Mike: 8 points
```

---

## 🔧 Bot Features

### Command Suggestions
Discord shows available commands when you type `/` in chat. Tab-complete for easy command entry.

### Ephemeral Messages
Most user responses are ephemeral (only you see them):
- `/addpet` confirmation
- `/myroster` list
- `/setpoints` confirmation
- Error messages

Public messages:
- `/leaderboard` results (everyone can see)
- `/listbreeds` results (everyone can see)
- Notifications in notification channel

### Error Handling
Bot provides clear error messages:
- "Pet A2043899 not found or already adopted!"
- "You've already drafted Buddy in this league!"
- "You need admin role to use this command!"

---

## 📊 How Adoption Scoring Works

1. **Scraper runs daily** (2 AM UTC by default)
2. **Checks both BARC sources** for changes
3. **Detects adopted pets** (no longer on either list)
4. **Awards points to all users** who drafted the pet
5. **Points = breed_points[breed]** (default 1)
6. **Leaderboard updates** automatically
7. **Discord notifies** the team of adoptions

**Example:**
- Buddy (German Shepherd mix) - 2 points each
- Sarah drafted Buddy in 3 leagues
- Buddy gets adopted
- Sarah receives: 2 + 2 + 2 = 6 points across those leagues

---

## 🛠️ Troubleshooting

### Bot not responding
- Check bot is in server (Discord settings → Apps → Integrations)
- Check bot has "Slash Commands" scope
- Restart bot: redeploy application

### "You need to sign up first!"
- User must create account on website first
- User must link Discord ID to account
- Try signing up again and entering Discord ID

### "League not found!"
- Check exact league name spelling
- League names are case-sensitive
- Try `/leaderboard` to see available leagues

### "You need admin role!"
- User doesn't have the configured admin role
- Ask server owner to assign role
- Check `ADMIN_ROLE_ID` is set correctly in `.env`

### Points not awarded
- Scraper may not have run yet (runs at 2 AM UTC)
- Pet might still be on fosters list
- Check `/admin/scraper-logs` for errors

### Leaderboard stuck
- Leaderboard updates after scraper runs
- May take 1-2 minutes to update
- Try `/leaderboard` again

---

## 📱 Best Practices

1. **Post league links** in Discord description
2. **Mention scraper schedule** - runs daily at 2 AM UTC
3. **Use notification channel** for important updates
4. **Set reasonable breed points** - don't make some breeds too valuable
5. **Encourage participation** - share leaderboard updates

---

## 🎯 Example Discord Server Setup

```
Fantasy Pet League
├── 📝 announcements
│   └── New leagues, important updates
├── 🐾 general
│   └── Chat and discussion
├── 🏆 leagues
│   ├── #houston-pet-lovers
│   ├── #austin-dog-league
│   └── #texas-cat-lovers
├── 🔔 notifications
│   └── Bot sends adoption alerts
└── 🎮 commands
    └── Users run /addpet, /myroster, etc.
```

---

## 🔗 Related Documentation

- [Complete Setup Guide](../COMPLETE_SETUP.md)
- [API Documentation](API.md)
- [Admin Dashboard Features](ADMIN_DASHBOARD.md)
- [Railway Deployment](../RAILWAY_DEPLOY.md)
