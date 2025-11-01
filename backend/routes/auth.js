// backend/routes/auth.js - FIXED Authentication endpoints
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

    if (!passphrase || !firstName) {
      return res.status(400).json({ error: 'Passphrase and first name required' });
    }

    // Hash the passphrase
    const hashedPassphrase = await bcrypt.hash(passphrase, 10);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (passphrase_hash, first_name, city, discord_id, is_admin)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, first_name, city, created_at`,
      [hashedPassphrase, firstName, city || null, discordId || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    // Handle unique constraint violation (user already exists)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'User already exists with that name' });
    }
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ LOGIN ============

router.post('/login', async (req, res) => {
  try {
    const { passphrase, firstName } = req.body;

    if (!passphrase || !firstName) {
      return res.status(400).json({ error: 'Passphrase and first name required' });
    }

    // Query user by first name
    const result = await pool.query(
      'SELECT id, first_name, city, is_admin, passphrase_hash FROM users WHERE first_name = $1 LIMIT 1',
      [firstName]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify passphrase matches
    const match = await bcrypt.compare(passphrase, user.passphrase_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid passphrase' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      user: {
        id: user.id,
        first_name: user.first_name,
        city: user.city,
        is_admin: user.is_admin
      },
      token 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ VERIFY TOKEN ============

router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      res.json({ valid: true, userId: user.userId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;