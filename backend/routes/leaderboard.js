// backend/routes/leaderboard.js - Leaderboard endpoints
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============ GET LEAGUE LEADERBOARD ============

router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.city,
        COALESCE(lc.total_points, 0) as total_points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(lc.total_points, 0) DESC) as rank
       FROM (
         SELECT DISTINCT re.user_id
         FROM roster_entries re
         WHERE re.league_id = $1
       ) users_in_league
       JOIN users u ON u.id = users_in_league.user_id
       LEFT JOIN leaderboard_cache lc ON lc.user_id = u.id AND lc.league_id = $1
       ORDER BY COALESCE(lc.total_points, 0) DESC
       LIMIT $2`,
      [leagueId, parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET GLOBAL LEADERBOARD ============

router.get('/', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.city,
        SUM(COALESCE(lc.total_points, 0)) as total_points,
        COUNT(DISTINCT lc.league_id) as leagues_joined,
        ROW_NUMBER() OVER (ORDER BY SUM(COALESCE(lc.total_points, 0)) DESC) as rank
       FROM users u
       LEFT JOIN leaderboard_cache lc ON lc.user_id = u.id
       GROUP BY u.id, u.first_name, u.city
       ORDER BY total_points DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET USER RANK IN LEAGUE ============

router.get('/user/:userId/league/:leagueId', async (req, res) => {
  try {
    const { userId, leagueId } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.city,
        COALESCE(lc.total_points, 0) as total_points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(lc.total_points, 0) DESC) as rank
       FROM users u
       LEFT JOIN leaderboard_cache lc ON lc.user_id = u.id AND lc.league_id = $1
       WHERE u.id = $2`,
      [leagueId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in league' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET GLOBAL USER RANK ============

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.city,
        SUM(COALESCE(lc.total_points, 0)) as total_points,
        COUNT(DISTINCT lc.league_id) as leagues_joined,
        ROW_NUMBER() OVER (ORDER BY SUM(COALESCE(lc.total_points, 0)) DESC) as rank
       FROM users u
       LEFT JOIN leaderboard_cache lc ON lc.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.first_name, u.city`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET TOP PERFORMERS (ALL TIME) ============

router.get('/top/alltime', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.city,
        SUM(COALESCE(lc.total_points, 0)) as total_points,
        COUNT(DISTINCT lc.league_id) as leagues_joined,
        ROW_NUMBER() OVER (ORDER BY SUM(COALESCE(lc.total_points, 0)) DESC) as rank
       FROM users u
       LEFT JOIN leaderboard_cache lc ON lc.user_id = u.id
       GROUP BY u.id, u.first_name, u.city
       ORDER BY total_points DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ REFRESH LEADERBOARD CACHE ============

router.post('/refresh', async (req, res) => {
  try {
    // Manually trigger leaderboard cache update
    await pool.query(`
      INSERT INTO leaderboard_cache (league_id, user_id, total_points, last_updated)
      SELECT 
        p.league_id,
        p.user_id,
        SUM(p.points_amount) as total_points,
        NOW()
      FROM points p
      GROUP BY p.league_id, p.user_id
      ON CONFLICT (league_id, user_id) 
      DO UPDATE SET 
        total_points = EXCLUDED.total_points,
        last_updated = NOW()
    `);

    res.json({ success: true, message: 'Leaderboard cache refreshed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET LEADERBOARD STATS ============

router.get('/stats/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const stats = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT user_id) as player_count FROM leaderboard_cache WHERE league_id = $1`,
        [leagueId]
      ),
      pool.query(
        `SELECT SUM(total_points) as total_points FROM leaderboard_cache WHERE league_id = $1`,
        [leagueId]
      ),
      pool.query(
        `SELECT AVG(total_points) as avg_points FROM leaderboard_cache WHERE league_id = $1`,
        [leagueId]
      ),
      pool.query(
        `SELECT MAX(total_points) as max_points FROM leaderboard_cache WHERE league_id = $1`,
        [leagueId]
      )
    ]);

    res.json({
      player_count: parseInt(stats[0].rows[0].player_count) || 0,
      total_points: parseInt(stats[1].rows[0].total_points) || 0,
      avg_points: Math.round(stats[2].rows[0].avg_points) || 0,
      max_points: parseInt(stats[3].rows[0].max_points) || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;