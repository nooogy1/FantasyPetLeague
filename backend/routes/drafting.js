// backend/routes/drafting.js - Pet drafting endpoints
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============ MIDDLEWARE ============

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  const jwt = require('jsonwebtoken');
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ============ DRAFT PET ============

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leagueId, petId } = req.body;
    const userId = req.user.userId;

    if (!leagueId || !petId) {
      return res.status(400).json({ error: 'League and pet required' });
    }

    // Get pet UUID from external pet_id
    const petResult = await pool.query(
      `SELECT id FROM pets WHERE pet_id = $1`,
      [petId]
    );

    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const petUUID = petResult.rows[0].id;

    // Insert roster entry
    const result = await pool.query(
      `INSERT INTO roster_entries (user_id, league_id, pet_id, drafted_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, drafted_at`,
      [userId, leagueId, petUUID]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Pet already drafted in this league' });
    }
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET MY ROSTER ============

router.get('/:leagueId', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        p.pet_id,
        p.name,
        p.breed,
        p.animal_type,
        p.gender,
        p.age,
        p.source,
        p.status,
        re.drafted_at
       FROM roster_entries re
       JOIN pets p ON p.id = re.pet_id
       WHERE re.user_id = $1 AND re.league_id = $2
       ORDER BY re.drafted_at DESC`,
      [userId, leagueId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ UNDRAFT PET ============

router.delete('/:petId/:leagueId', authenticateToken, async (req, res) => {
  try {
    const { petId, leagueId } = req.params;
    const userId = req.user.userId;

    // Get pet UUID
    const petResult = await pool.query(
      `SELECT id FROM pets WHERE pet_id = $1`,
      [petId]
    );

    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const petUUID = petResult.rows[0].id;

    // Delete roster entry
    const result = await pool.query(
      `DELETE FROM roster_entries 
       WHERE user_id = $1 AND league_id = $2 AND pet_id = $3
       RETURNING id`,
      [userId, leagueId, petUUID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Roster entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET ALL ROSTERS IN LEAGUE (with pets) ============

router.get('/league/:leagueId/rosters', async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Get all users in league with their pets
    const result = await pool.query(
      `SELECT 
        u.id as user_id,
        u.first_name,
        u.city,
        json_agg(
          json_build_object(
            'name', p.name,
            'age', p.age,
            'animal_type', p.animal_type,
            'breed', p.breed,
            'drafted_date', re.drafted_at
          )
        ) FILTER (WHERE p.id IS NOT NULL) as pets
       FROM league_members lm
       JOIN users u ON u.id = lm.user_id
       LEFT JOIN roster_entries re ON re.user_id = u.id AND re.league_id = $1
       LEFT JOIN pets p ON p.id = re.pet_id
       WHERE lm.league_id = $1
       GROUP BY u.id, u.first_name, u.city
       ORDER BY u.first_name ASC`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET ALL PETS DRAFTED IN LEAGUE ============

router.get('/league/:leagueId/pets', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT p.pet_id, p.name
       FROM roster_entries re
       JOIN pets p ON p.id = re.pet_id
       WHERE re.league_id = $1`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET DRAFT HISTORY ============

router.get('/history/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT 
        re.drafted_at,
        u.first_name,
        p.name,
        p.breed,
        p.animal_type,
        p.status
       FROM roster_entries re
       JOIN users u ON u.id = re.user_id
       JOIN pets p ON p.id = re.pet_id
       WHERE re.league_id = $1
       ORDER BY re.drafted_at DESC
       LIMIT 50`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;