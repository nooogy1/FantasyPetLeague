// backend/routes/wordlist.js - Passphrase wordlist endpoint
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============ GET WORDLIST ============

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT word_type, word
      FROM passphrase_words
      ORDER BY word_type, word
    `);

    const wordlist = {
      adverbs: [],
      adjectives: [],
      breeds: []
    };

    result.rows.forEach(row => {
      if (row.word_type === 'adverb') {
        wordlist.adverbs.push(row.word);
      } else if (row.word_type === 'adjective') {
        wordlist.adjectives.push(row.word);
      } else if (row.word_type === 'breed') {
        wordlist.breeds.push(row.word);
      }
    });

    res.json(wordlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;