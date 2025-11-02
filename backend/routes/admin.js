// backend/routes/admin.js - Admin endpoints (Breeds + Users + Leagues)
// Handles breed point management, user management, and league management
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
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication error: ' + error.message });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = result.rows[0].is_admin;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Admin check error: ' + error.message });
  }
};

// ============ STATISTICS ============

router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM leagues'),
      pool.query('SELECT COUNT(*) as count FROM pets WHERE status = $1', ['available']),
      pool.query('SELECT COUNT(*) as count FROM pets WHERE status = $1', ['removed']),
      pool.query('SELECT COUNT(*) as count FROM drafting'),
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

// ============ BREED POINTS ENDPOINTS ============

router.get('/breed-points', authenticateToken, requireAdmin, async (req, res) => {
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

router.get('/missing-breeds', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT breed, COUNT(*) as count
      FROM pets
      WHERE breed NOT IN (SELECT breed FROM breed_points)
      GROUP BY breed
      ORDER BY count DESC, breed ASC
    `);

    res.json({ missing_breeds: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/breed-points/auto-populate', authenticateToken, requireAdmin, async (req, res) => {
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

router.put('/breed-points/:breedId', authenticateToken, requireAdmin, async (req, res) => {
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

router.post('/breed-points', authenticateToken, requireAdmin, async (req, res) => {
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

router.delete('/breed-points/:breedId', authenticateToken, requireAdmin, async (req, res) => {
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

// ============ SCRAPER LOGS (Read-Only) ============

router.get('/scraper-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scraper_logs ORDER BY run_date DESC LIMIT 20`
    );

    res.json({ logs: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS ENDPOINTS ============

// GET all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Fetching all users');
    const result = await pool.query(
      'SELECT id, first_name, city, is_admin, created_at FROM users ORDER BY created_at DESC'
    );

    console.log('[ADMIN] Returning', result.rows.length, 'users');
    res.json(result.rows);
  } catch (error) {
    console.error('[ADMIN] Error fetching users:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[ADMIN] Deleting user:', userId);

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get user info for logging
      const userResult = await client.query('SELECT first_name FROM users WHERE id = $1', [userId]);
      const userName = userResult.rows[0]?.first_name || 'Unknown';

      // Delete drafted pets for this user in all leagues
      await client.query('DELETE FROM drafting WHERE user_id = $1', [userId]);
      console.log('[ADMIN] Deleted user drafts:', userId);

      // Delete league memberships
      await client.query('DELETE FROM league_members WHERE user_id = $1', [userId]);
      console.log('[ADMIN] Deleted league memberships:', userId);

      // Delete the user
      const deleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      console.log('[ADMIN] User deleted successfully:', userName);
      res.json({ 
        success: true, 
        message: `User "${userName}" and all associated data deleted` 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ADMIN] Error deleting user:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ LEAGUES ENDPOINTS ============

// GET all leagues with member counts
router.get('/leagues', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Fetching all leagues');
    const result = await pool.query(`
      SELECT 
        l.id,
        l.name,
        COUNT(lm.user_id) as member_count,
        l.created_at
      FROM leagues l
      LEFT JOIN league_members lm ON l.id = lm.league_id
      GROUP BY l.id, l.name, l.created_at
      ORDER BY l.created_at DESC
    `);

    console.log('[ADMIN] Returning', result.rows.length, 'leagues');
    res.json(result.rows);
  } catch (error) {
    console.error('[ADMIN] Error fetching leagues:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE league
router.delete('/leagues/:leagueId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leagueId } = req.params;
    console.log('[ADMIN] Deleting league:', leagueId);

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get league info for logging
      const leagueResult = await client.query('SELECT name FROM leagues WHERE id = $1', [leagueId]);
      const leagueName = leagueResult.rows[0]?.name || 'Unknown';

      // Delete all drafted pets in this league
      await client.query('DELETE FROM drafting WHERE league_id = $1', [leagueId]);
      console.log('[ADMIN] Deleted drafts for league:', leagueId);

      // Delete all league memberships
      await client.query('DELETE FROM league_members WHERE league_id = $1', [leagueId]);
      console.log('[ADMIN] Deleted league memberships:', leagueId);

      // Delete the league
      const deleteResult = await client.query('DELETE FROM leagues WHERE id = $1', [leagueId]);

      await client.query('COMMIT');

      console.log('[ADMIN] League deleted successfully:', leagueName);
      res.json({ 
        success: true, 
        message: `League "${leagueName}" and all associated data deleted` 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ADMIN] Error deleting league:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ EXPORT ============

module.exports = router;