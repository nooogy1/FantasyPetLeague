// admin-dashboard.js - Express routes for admin panel
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// ============ MIDDLEWARE ============

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

const requireAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ BREED POINTS ENDPOINTS ============

// GET /admin/breeds - List all breed points with counts
router.get('/breeds', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bp.id,
        bp.breed,
        bp.points,
        COUNT(p.id) as pet_count,
        bp.updated_at
      FROM breed_points bp
      LEFT JOIN pets p ON p.breed = bp.breed
      GROUP BY bp.id, bp.breed, bp.points, bp.updated_at
      ORDER BY bp.points DESC, bp.breed ASC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/breeds/missing - Get breeds in pets table not in breed_points
router.get('/breeds/missing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT breed, COUNT(*) as pet_count
      FROM pets
      WHERE breed NOT IN (SELECT breed FROM breed_points)
      GROUP BY breed
      ORDER BY pet_count DESC, breed ASC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/breeds/auto-populate - Auto-populate missing breeds with default 1 point
router.post('/breeds/auto-populate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      INSERT INTO breed_points (breed, points)
      SELECT DISTINCT breed, 1
      FROM pets
      WHERE breed NOT IN (SELECT breed FROM breed_points)
      AND breed IS NOT NULL
      ON CONFLICT (breed) DO NOTHING
      RETURNING breed, points
    `);

    res.json({
      success: true,
      added: result.rows.length,
      breeds: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/breeds/:breedId - Update breed points
router.put('/breeds/:breedId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { breedId } = req.params;
    const { points } = req.body;

    if (!points || points < 1) {
      return res.status(400).json({ error: 'Points must be >= 1' });
    }

    const result = await pool.query(
      'UPDATE breed_points SET points = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [points, breedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breed not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/breeds - Create new breed point entry
router.post('/breeds', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { breed, points } = req.body;

    if (!breed || !points) {
      return res.status(400).json({ error: 'Breed and points required' });
    }

    const result = await pool.query(
      `INSERT INTO breed_points (breed, points)
       VALUES ($1, $2)
       ON CONFLICT (breed)
       DO UPDATE SET points = $2, updated_at = NOW()
       RETURNING *`,
      [breed, points]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/breeds/:breedId - Delete breed point entry
router.delete('/breeds/:breedId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { breedId } = req.params;

    const result = await pool.query(
      'DELETE FROM breed_points WHERE id = $1 RETURNING *',
      [breedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breed not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATISTICS ============

// GET /admin/stats - Overall statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM leagues'),
      pool.query('SELECT COUNT(*) as count FROM pets WHERE status = $1', ['available']),
      pool.query('SELECT COUNT(*) as count FROM pets WHERE status = $1', ['removed']),
      pool.query('SELECT COUNT(*) as count FROM roster_entries'),
      pool.query('SELECT SUM(points_amount) as total FROM points'),
      pool.query('SELECT COUNT(*) as count FROM breed_points')
    ]);

    res.json({
      total_users: stats[0].rows[0].count,
      total_leagues: stats[1].rows[0].count,
      available_pets: stats[2].rows[0].count,
      adopted_pets: stats[3].rows[0].count,
      total_drafts: stats[4].rows[0].count,
      total_points_awarded: stats[5].rows[0].total || 0,
      breed_points_configured: stats[6].rows[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/scraper-logs - Recent scraper runs
router.get('/scraper-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scraper_logs ORDER BY run_date DESC LIMIT 20`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXPORT ============

module.exports = router;
