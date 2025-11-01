// backend/routes/leagues.js - League management endpoints
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

// ============ CREATE LEAGUE ============

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ error: 'League name required' });
    }

    const result = await pool.query(
      `INSERT INTO leagues (name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name, owner_id, created_at`,
      [name, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET ALL LEAGUES ============

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, owner_id, created_at FROM leagues`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET LEAGUE BY ID ============

router.get('/:leagueId', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT id, name, owner_id, created_at FROM leagues WHERE id = $1`,
      [leagueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ UPDATE LEAGUE ============

router.put('/:leagueId', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ error: 'League name required' });
    }

    // Check user is owner
    const ownerCheck = await pool.query(
      `SELECT owner_id FROM leagues WHERE id = $1`,
      [leagueId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Only league owner can update' });
    }

    const result = await pool.query(
      `UPDATE leagues SET name = $1 WHERE id = $2 RETURNING *`,
      [name, leagueId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DELETE LEAGUE ============

router.delete('/:leagueId', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const userId = req.user.userId;

    // Check user is owner
    const ownerCheck = await pool.query(
      `SELECT owner_id FROM leagues WHERE id = $1`,
      [leagueId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Only league owner can delete' });
    }

    await pool.query(
      `DELETE FROM leagues WHERE id = $1`,
      [leagueId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET LEAGUE MEMBERS ============

router.get('/:leagueId/members', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.city
       FROM users u
       JOIN roster_entries re ON re.user_id = u.id
       WHERE re.league_id = $1
       ORDER BY u.first_name ASC`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;