// backend/routes/admin.js - Admin endpoints for management tasks
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

console.log('[Admin Routes] Loaded with JWT_SECRET:', JWT_SECRET ? '✓' : '✗');

// ============ MIDDLEWARE ============

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log(`[Auth Check] Token present: ${!!token}, Header: ${authHeader ? 'yes' : 'no'}`);

    if (!token) {
      console.log('[Auth] No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log('[Auth] Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      console.log('[Auth] Token valid for user:', user.userId);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('[Auth] Unexpected error:', error.message);
    res.status(500).json({ error: 'Authentication error: ' + error.message });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    console.log('[Admin Check] Checking admin status for user:', req.user.userId);

    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!result.rows[0]) {
      console.log('[Admin] User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = result.rows[0].is_admin;
    console.log('[Admin] User is_admin:', isAdmin);

    if (!isAdmin) {
      console.log('[Admin] Access denied - not an admin');
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[Admin] Access granted');
    next();
  } catch (error) {
    console.error('[Admin] Database error:', error.message);
    res.status(500).json({ error: 'Admin check error: ' + error.message });
  }
};

// ============ TRIGGER PET SCRAPER ============

router.post('/scrape', authenticateToken, async (req, res) => {
  try {
    console.log('[Scraper] ====================================');
    console.log('[Scraper] Scraper triggered by user:', req.user.userId);
    
    // Spawn Python scraper as child process (non-blocking)
    const pythonScript = path.join(__dirname, '../../scraper/daily_scraper.py');
    
    console.log('[Scraper] Python script path:', pythonScript);
    console.log('[Scraper] Starting scraper process...');
    
    const pythonProcess = spawn('python3', [pythonScript], {
      env: { ...process.env },
      detached: true, // Run independently
    });

    let output = '';
    let errorOutput = '';
    let timedOut = false;
    let responseSent = false;

    // Set timeout - if scraper takes > 5 seconds, return and let it run in background
    const timeout = setTimeout(() => {
      timedOut = true;
      console.log('[Scraper] Timeout reached (5s), returning response and continuing in background');
      
      if (!responseSent) {
        responseSent = true;
        res.json({
          success: true,
          status: 'running',
          message: 'Scraper started and running in background. Check admin logs for results.',
          note: 'Scraper typically takes 30-60 seconds to complete.',
        });
      }
    }, 5000); // Wait up to 5 seconds for initial response

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('[Scraper Output]', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('[Scraper Error]', data.toString());
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);

      console.log('[Scraper] Process closed with code:', code);

      if (timedOut) {
        // Already sent response, just log
        console.log('[Scraper] Already sent response, just logging completion');
        return;
      }

      if (code !== 0) {
        console.error('[Scraper] Failed with code:', code);
        if (!responseSent) {
          responseSent = true;
          return res.status(500).json({
            success: false,
            error: `Scraper failed: ${errorOutput}`,
          });
        }
        return;
      }

      try {
        // Parse JSON from last line of output
        const lines = output.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);

        console.log('[Scraper] Complete:', result);
        
        if (!responseSent) {
          responseSent = true;
          res.json({
            success: true,
            status: 'completed',
            ...result,
          });
        }
      } catch (error) {
        console.error('[Scraper] Failed to parse output:', error);
        if (!responseSent) {
          responseSent = true;
          res.json({
            success: true,
            status: 'completed',
            message: 'Scraper completed. Check logs for details.',
          });
        }
      }
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Scraper] Failed to start:', error.message);
      
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({
          success: false,
          error: `Failed to start scraper: ${error.message}`,
        });
      }
    });

    // Unref to allow parent process to exit
    pythonProcess.unref();
    
    console.log('[Scraper] Process spawned successfully');
    console.log('[Scraper] ====================================');
  } catch (error) {
    console.error('[Scraper] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ BREED POINTS ENDPOINTS ============

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