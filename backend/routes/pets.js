// backend/routes/pets.js - Pet listing endpoints
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============ LIST PETS WITH FILTERS ============

router.get('/', async (req, res) => {
  try {
    const { type, status, source, breed, limit = 100, offset = 0 } = req.query;
    let query = `SELECT * FROM pets WHERE 1=1`;
    const params = [];

    if (type) {
      params.push(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace('s', ''));
      query += ` AND animal_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (source) {
      params.push(source);
      query += ` AND source = $${params.length}`;
    }

    if (breed) {
      params.push(`%${breed}%`);
      query += ` AND breed ILIKE $${params.length}`;
    }

    query += ` ORDER BY first_seen DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET PET BY ID ============

router.get('/id/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const result = await pool.query(
      `SELECT * FROM pets WHERE pet_id = $1`,
      [petId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET AVAILABLE PETS COUNT ============

router.get('/count/available', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM pets WHERE status = 'available'`
    );

    res.json({ available: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET PETS BY TYPE ============

router.get('/type/:animalType', async (req, res) => {
  try {
    const { animalType } = req.params;
    const { status = 'available', limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT * FROM pets 
       WHERE animal_type = $1 AND status = $2
       ORDER BY first_seen DESC
       LIMIT $3`,
      [animalType, status, parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET PETS BY BREED ============

router.get('/breed/:breed', async (req, res) => {
  try {
    const { breed } = req.params;
    const { status = 'available', limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT * FROM pets 
       WHERE breed ILIKE $1 AND status = $2
       ORDER BY first_seen DESC
       LIMIT $3`,
      [`%${breed}%`, status, parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET RECENTLY ADOPTED PETS ============

router.get('/adopted/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT * FROM pets 
       WHERE status = 'removed'
       ORDER BY last_seen DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET NEW PETS ============

router.get('/new/today', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pets 
       WHERE first_seen = CURRENT_DATE
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET PET STATISTICS ============

router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM pets WHERE status = 'available'`),
      pool.query(`SELECT COUNT(*) as count FROM pets WHERE status = 'removed'`),
      pool.query(`SELECT COUNT(DISTINCT breed) as count FROM pets WHERE breed IS NOT NULL`),
      pool.query(`SELECT COUNT(DISTINCT animal_type) as count FROM pets WHERE animal_type IS NOT NULL`),
      pool.query(`SELECT COUNT(*) as count FROM pets WHERE first_seen = CURRENT_DATE`)
    ]);

    res.json({
      total_available: parseInt(stats[0].rows[0].count),
      total_adopted: parseInt(stats[1].rows[0].count),
      unique_breeds: parseInt(stats[2].rows[0].count),
      animal_types: parseInt(stats[3].rows[0].count),
      new_today: parseInt(stats[4].rows[0].count)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET POPULAR BREEDS ============

router.get('/stats/popular-breeds', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT breed, COUNT(*) as count 
       FROM pets 
       WHERE breed IS NOT NULL
       GROUP BY breed
       ORDER BY count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET DRAFT POPULARITY ============

router.get('/stats/draft-popularity', async (req, res) => {
  try {
    const { limit = 15 } = req.query;

    const result = await pool.query(
      `SELECT p.pet_id, p.name, p.breed, COUNT(re.id) as draft_count
       FROM pets p
       LEFT JOIN roster_entries re ON re.pet_id = p.id
       WHERE p.status = 'available'
       GROUP BY p.id, p.pet_id, p.name, p.breed
       ORDER BY draft_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
