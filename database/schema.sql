-- Fantasy Pet League Database Schema

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  city TEXT,
  passphrase_hash TEXT NOT NULL,
  discord_id TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leagues table
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pets table (primary source of truth)
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id TEXT NOT NULL UNIQUE,  -- External ID like A2043899
  name TEXT,
  breed TEXT,
  animal_type TEXT,  -- Dog, Cat, etc
  gender TEXT,
  age TEXT,
  brought_to_shelter DATE,
  location TEXT,
  source TEXT,  -- 'adoptables' or 'fosters'
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'removed')),
  first_seen DATE DEFAULT CURRENT_DATE,
  last_seen DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Breed points table (editable, auto-populates from pets table)
CREATE TABLE breed_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed TEXT NOT NULL UNIQUE,
  points INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roster entries (what users have drafted)
CREATE TABLE roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  drafted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, league_id, pet_id)  -- Can't draft same pet twice in same league
);

-- Points awarded table (history)
CREATE TABLE points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  points_amount INT DEFAULT 1,
  awarded_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard cache (for performance)
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  total_points INT DEFAULT 0,
  ranking INT,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Scraper logs (for debugging)
CREATE TABLE scraper_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,  -- 'adoptables' or 'fosters'
  run_date TIMESTAMP DEFAULT NOW(),
  pets_found INT,
  new_pets INT,
  removed_pets INT,
  points_awarded INT,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_pets_pet_id ON pets(pet_id);
CREATE INDEX idx_pets_status ON pets(status);
CREATE INDEX idx_pets_source ON pets(source);
CREATE INDEX idx_roster_user_league ON roster_entries(user_id, league_id);
CREATE INDEX idx_points_user_league ON points(user_id, league_id);
CREATE INDEX idx_leaderboard_league ON leaderboard_cache(league_id);

-- Create first admin user (update passphrase_hash after creation)
INSERT INTO users (first_name, passphrase_hash, is_admin) 
VALUES ('Admin', '$2b$10$placeholder', TRUE) 
ON CONFLICT DO NOTHING;
