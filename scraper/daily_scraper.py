#!/usr/bin/env python3
"""
Fantasy Pet League - Daily Scraper
Fetches BARC adoptables and fosters, detects changes, awards points
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from playwright.sync_api import sync_playwright
import json
import time
import re
from datetime import datetime
from dotenv import load_dotenv
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def extract_animals_from_page(page):
    """Extract all animal data from current page"""
    
    page_text = page.evaluate("() => document.body.innerText")
    
    animals = []
    lines = page_text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        if line.startswith('Name:'):
            animal = {
                'name': line.replace('Name:', '').strip(),
                'gender': None,
                'breed': None,
                'animal_type': None,
                'age': None,
                'brought_to_shelter': None,
                'location': None
            }
            
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('Name:'):
                current = lines[i].strip()
                
                if current.startswith('Gender:'):
                    animal['gender'] = current.replace('Gender:', '').strip()
                elif current.startswith('Breed:'):
                    animal['breed'] = current.replace('Breed:', '').strip()
                elif current.startswith('Animal type:'):
                    animal['animal_type'] = current.replace('Animal type:', '').strip()
                elif current.startswith('Age:'):
                    animal['age'] = current.replace('Age:', '').strip()
                elif current.startswith('Brought to the shelter:'):
                    animal['brought_to_shelter'] = current.replace('Brought to the shelter:', '').strip()
                elif current.startswith('Located at:'):
                    animal['location'] = current.replace('Located at:', '').strip()
                    break
                
                i += 1
            
            if animal['breed']:
                animals.append(animal)
        else:
            i += 1
    
    return animals

def scrape_source(page, url, source_name):
    """Scrape a single source (adoptables or fosters)"""
    
    logger.info(f"Scraping {source_name} from {url}")
    
    page.goto(url, wait_until="networkidle")
    time.sleep(2)
    
    page_text = page.evaluate("() => document.body.innerText")
    match = re.search(r'Animals:\s*(\d+)\s*-\s*(\d+)\s*of\s*(\d+)', page_text)
    
    if match:
        total_animals = int(match.group(3))
        logger.info(f"Found {total_animals} animals on {source_name}")
    else:
        total_animals = 0
        logger.warning(f"Could not find total count for {source_name}")
    
    all_animals = []
    index = 0
    page_num = 1
    
    while index <= total_animals:
        if index == 0:
            page_url = url
        else:
            page_url = f"{url}?index={index}"
        
        page.goto(page_url, wait_until="networkidle")
        time.sleep(1)
        
        animals = extract_animals_from_page(page)
        
        for animal in animals:
            animal['source'] = source_name
        
        all_animals.extend(animals)
        
        if len(animals) < 30:
            break
        
        index += 30
        page_num += 1
    
    logger.info(f"Scraped {len(all_animals)} total animals from {source_name}")
    return all_animals

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def update_database(adoptables, fosters):
    """Update database with new/removed pets and award points"""
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Combine current scrape data
        current_pets = {p['name']: p for p in adoptables + fosters}
        
        # Get existing pets from database
        cur.execute("SELECT pet_id, name, status FROM pets")
        existing_pets = {row['pet_id']: row for row in cur.fetchall()}
        
        new_pets_count = 0
        removed_pets_count = 0
        points_awarded_count = 0
        
        # INSERT new pets
        for name, pet_data in current_pets.items():
            if name not in existing_pets:
                cur.execute("""
                    INSERT INTO pets (pet_id, name, breed, animal_type, gender, age, 
                                     brought_to_shelter, location, source, status, first_seen, last_seen)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'available', CURRENT_DATE, CURRENT_DATE)
                """, (
                    name, name, pet_data['breed'], pet_data['animal_type'], 
                    pet_data['gender'], pet_data['age'], pet_data['brought_to_shelter'],
                    pet_data['location'], pet_data['source']
                ))
                new_pets_count += 1
        
        conn.commit()
        
        # UPDATE last_seen for pets still on lists
        for name in current_pets.keys():
            cur.execute("""
                UPDATE pets SET last_seen = CURRENT_DATE WHERE pet_id = %s
            """, (name,))
        
        conn.commit()
        
        # DETECT removed pets and award points
        cur.execute("SELECT id, pet_id, breed FROM pets WHERE status = 'available'")
        available_pets = cur.fetchall()
        
        for pet in available_pets:
            if pet['pet_id'] not in current_pets:
                # Pet no longer on either list - it's adopted!
                logger.info(f"Pet {pet['pet_id']} has been adopted!")
                
                # Get point value for this breed
                cur.execute("""
                    SELECT points FROM breed_points WHERE breed = %s
                """, (pet['breed'],))
                
                breed_points = cur.fetchone()
                points_value = breed_points['points'] if breed_points else 1
                
                # Find all users who drafted this pet
                cur.execute("""
                    SELECT DISTINCT user_id, league_id FROM roster_entries 
                    WHERE pet_id = %s
                """, (pet['id'],))
                
                for row in cur.fetchall():
                    user_id = row['user_id']
                    league_id = row['league_id']
                    
                    # Award points
                    cur.execute("""
                        INSERT INTO points (user_id, league_id, pet_id, points_amount)
                        VALUES (%s, %s, %s, %s)
                    """, (user_id, league_id, pet['id'], points_value))
                    
                    points_awarded_count += 1
                    logger.info(f"Awarded {points_value} points to user {user_id} for pet {pet['pet_id']}")
                
                # Mark pet as removed
                cur.execute("""
                    UPDATE pets SET status = 'removed' WHERE id = %s
                """, (pet['id'],))
        
        conn.commit()
        
        # Update leaderboard cache
        cur.execute("""
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
        """)
        
        conn.commit()
        
        # Log the scrape
        cur.execute("""
            INSERT INTO scraper_logs (source, pets_found, new_pets, removed_pets, points_awarded)
            VALUES (%s, %s, %s, %s, %s)
        """, ('combined', len(current_pets), new_pets_count, removed_pets_count, points_awarded_count))
        
        conn.commit()
        
        logger.info(f"Scrape complete: {new_pets_count} new, {removed_pets_count} removed, {points_awarded_count} points awarded")
        
        return {
            'new_pets': new_pets_count,
            'removed_pets': removed_pets_count,
            'points_awarded': points_awarded_count
        }
        
    except Exception as e:
        logger.error(f"Database error: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

def main():
    logger.info("Starting daily scraper...")
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_viewport_size({"width": 1280, "height": 720})
            
            # Scrape both sources
            adoptables = scrape_source(page, "https://24petconnect.com/BARCadopt", "adoptables")
            fosters = scrape_source(page, "https://24petconnect.com/BARCFosters", "fosters")
            
            browser.close()
        
        # Update database and award points
        results = update_database(adoptables, fosters)
        
        logger.info(f"Scraper finished successfully: {results}")
        return results
        
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        raise

if __name__ == "__main__":
    main()
