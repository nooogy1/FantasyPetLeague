// backend/routes/auth.js - Authentication endpoints
// LOGIN: Only passphrase required
// SIGNUP: Passphrase + first name + optional city

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

console.log('[AUTH] Initialized - Passphrase-based authentication');

// ============ SIGNUP ============

router.post('/signup', async (req, res) => {
  try {
    const { passphrase, firstName, city, discordId } = req.body;

    console.log('[SIGNUP] Request received:', { firstName, city, hasPassphrase: !!passphrase });

    if (!passphrase || !firstName) {
      console.log('[SIGNUP] Missing required fields: passphrase or firstName');
      return res.status(400).json({ error: 'Passphrase and first name required' });
    }

    // Hash the passphrase
    const hashedPassphrase = await bcrypt.hash(passphrase, 10);
    console.log('[SIGNUP] Passphrase hashed successfully');

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (passphrase_hash, first_name, city, discord_id, is_admin)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, first_name, city, is_admin, created_at`,
      [hashedPassphrase, firstName, city || null, discordId || null]
    );

    const user = result.rows[0];
    console.log('[SIGNUP] User created:', { id: user.id, firstName: user.first_name });

    const token = jwt.sign({ userId: user.id, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    console.log('[SIGNUP] Token generated successfully');

    res.status(201).json({ 
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        city: user.city,
        is_admin: user.is_admin
      }, 
      token 
    });
  } catch (error) {
    console.error('[SIGNUP] Error:', error.code, error.message);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this passphrase already exists' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ============ LOGIN - PASSPHRASE ONLY ============

router.post('/login', async (req, res) => {
  try {
    const { passphrase } = req.body;

    console.log('[LOGIN] Request received - passphrase-only login');

    if (!passphrase) {
      console.log('[LOGIN] Missing passphrase');
      return res.status(400).json({ error: 'Passphrase required' });
    }

    // Get ALL users to find passphrase match
    const result = await pool.query(
      'SELECT id, first_name, city, is_admin, passphrase_hash FROM users'
    );

    console.log('[LOGIN] Searching through', result.rows.length, 'accounts...');

    let matchedUser = null;

    // Compare passphrase against all users
    for (const user of result.rows) {
      const match = await bcrypt.compare(passphrase, user.passphrase_hash);
      if (match) {
        matchedUser = user;
        console.log('[LOGIN] ✓ Passphrase match found for:', user.first_name);
        break;
      }
    }

    if (!matchedUser) {
      console.log('[LOGIN] ✗ No account found with this passphrase');
      return res.status(401).json({ error: 'Invalid passphrase. Account not found.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: matchedUser.id, isAdmin: matchedUser.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[LOGIN] ✓ Token generated. Authenticating user:', matchedUser.first_name);

    res.json({ 
      success: true,
      user: {
        id: matchedUser.id,
        first_name: matchedUser.first_name,
        city: matchedUser.city,
        is_admin: matchedUser.is_admin
      },
      token 
    });
  } catch (error) {
    console.error('[LOGIN] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ VERIFY TOKEN ============

router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('[VERIFY] Token verification request');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log('[VERIFY] Token invalid:', err.message);
        return res.status(403).json({ error: 'Invalid token', details: err.message });
      }
      console.log('[VERIFY] ✓ Token valid for user:', user.userId);
      res.json({ valid: true, userId: user.userId, isAdmin: user.isAdmin });
    });
  } catch (error) {
    console.error('[VERIFY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ DEBUG ENDPOINTS (dev only) ============

router.get('/debug/users', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const result = await pool.query(
      'SELECT id, first_name, city, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );

    res.json({
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;