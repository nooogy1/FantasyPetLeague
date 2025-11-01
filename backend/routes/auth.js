// backend/routes/auth.js - Authentication endpoints
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// ============ SIGNUP ============

router.post('/signup', async (req, res) => {
  try {
    const { passphrase, firstName, city, discordId } = req.body;

    if (!passphrase) {
      return res.status(400).json({ error: 'Passphrase required' });
    }

    const hashedPassphrase = await bcrypt.hash(passphrase, 10);

    const result = await pool.query(
      `INSERT INTO users (passphrase_hash, first_name, city, discord_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, city, created_at`,
      [hashedPassphrase, firstName || null, city || null, discordId || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ LOGIN ============

router.post('/login', async (req, res) => {
  try {
    const { passphrase } = req.body;

    if (!passphrase) {
      return res.status(400).json({ error: 'Passphrase required' });
    }

    // Find user by checking passphrase against all users
    const result = await pool.query('SELECT id, first_name, city, passphrase_hash FROM users');

    let user = null;
    for (const row of result.rows) {
      const match = await bcrypt.compare(passphrase, row.passphrase_hash);
      if (match) {
        user = row;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid passphrase' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      user: {
        id: user.id,
        first_name: user.first_name,
        city: user.city
      },
      token 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;