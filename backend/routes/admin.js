// backend/routes/admin.js - Admin endpoints for management tasks
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { scrapeAndStore } = require('../scrapers/houston-scraper');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============ TRIGGER PET SCRAPER ============

router.post('/scrape', async (req, res) => {
  try {
    const result = await scrapeAndStore();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SEED TEST PETS ============

router.post('/seed-pets', async (req, res) => {
  try {
    // Sample pets to seed
    const testPets = [
      { pet_id: 'pet_001', name: 'Buddy', breed: 'golden retriever', animal_type: 'Dog', gender: 'Male', age: '3 years', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_002', name: 'Luna', breed: 'husky', animal_type: 'Dog', gender: 'Female', age: '2 years', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_003', name: 'Whiskers', breed: 'tabby', animal_type: 'Cat', gender: 'Male', age: '1 year', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_004', name: 'Mittens', breed: 'persian', animal_type: 'Cat', gender: 'Female', age: '5 years', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_005', name: 'Max', breed: 'labrador', animal_type: 'Dog', gender: 'Male', age: '4 years', source: 'Austin Shelter', status: 'available' },
      { pet_id: 'pet_006', name: 'Bella', breed: 'corgi', animal_type: 'Dog', gender: 'Female', age: '2 years', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_007', name: 'Shadow', breed: 'black cat', animal_type: 'Cat', gender: 'Male', age: '3 years', source: 'Austin Shelter', status: 'available' },
      { pet_id: 'pet_008', name: 'Daisy', breed: 'poodle', animal_type: 'Dog', gender: 'Female', age: '1 year', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_009', name: 'Charlie', breed: 'beagle', animal_type: 'Dog', gender: 'Male', age: '2 years', source: 'Dallas Shelter', status: 'available' },
      { pet_id: 'pet_010', name: 'Snowball', breed: 'white cat', animal_type: 'Cat', gender: 'Female', age: '1 year', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_011', name: 'Rocky', breed: 'doberman', animal_type: 'Dog', gender: 'Male', age: '4 years', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_012', name: 'Cinnamon', breed: 'bengal', animal_type: 'Cat', gender: 'Female', age: '2 years', source: 'Austin Shelter', status: 'available' },
      { pet_id: 'pet_013', name: 'Teddy', breed: 'pomeranian', animal_type: 'Dog', gender: 'Male', age: '1 year', source: 'Houston Shelter', status: 'available' },
      { pet_id: 'pet_014', name: 'Jasper', breed: 'siamese', animal_type: 'Cat', gender: 'Male', age: '3 years', source: 'Dallas Shelter', status: 'available' },
      { pet_id: 'pet_015', name: 'Scout', breed: 'german shepherd', animal_type: 'Dog', gender: 'Female', age: '3 years', source: 'Houston Shelter', status: 'available' },
    ];

    let inserted = 0;
    for (const pet of testPets) {
      try {
        await pool.query(
          `INSERT INTO pets (pet_id, name, breed, animal_type, gender, age, source, status, first_seen, last_seen)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, CURRENT_DATE)
           ON CONFLICT (pet_id) DO NOTHING`,
          [pet.pet_id, pet.name, pet.breed, pet.animal_type, pet.gender, pet.age, pet.source, pet.status]
        );
        inserted++;
      } catch (error) {
        console.error(`Error inserting pet ${pet.pet_id}:`, error.message);
      }
    }

    res.json({ success: true, inserted, message: `Seeded ${inserted} test pets` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET DATABASE STATS ============

router.get('/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users`),
      pool.query(`SELECT COUNT(*) as count FROM leagues`),
      pool.query(`SELECT COUNT(*) as count FROM pets`),
      pool.query(`SELECT COUNT(*) as count FROM roster_entries`),
      pool.query(`SELECT COUNT(*) as count FROM points`),
    ]);

    res.json({
      users: parseInt(stats[0].rows[0].count),
      leagues: parseInt(stats[1].rows[0].count),
      pets: parseInt(stats[2].rows[0].count),
      roster_entries: parseInt(stats[3].rows[0].count),
      points_awarded: parseInt(stats[4].rows[0].count),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;