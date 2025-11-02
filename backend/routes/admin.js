// backend/routes/admin.js - Admin management endpoints

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ===== Middleware =====

// Authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.userId = user.userId;
    req.isAdmin = user.isAdmin;
    next();
  });
};

// Check if admin
const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    console.log('[ADMIN] Non-admin user attempted access:', req.userId);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ===== USERS =====

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

// ===== LEAGUES =====

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

module.exports = router;