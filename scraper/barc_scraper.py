#!/usr/bin/env python3
"""
Scrape BARC adoptables AND fosters, tag by source, insert into PostgreSQL
"""

import os
import json
import time
import re
import sys
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'playwright', 'psycopg2-binary', '--break-system-packages'])
    from playwright.sync_api import sync_playwright
    import psycopg2
    from psycopg2.extras import execute_values

def get_db_connection():
    """Connect to PostgreSQL database"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    
    # Parse connection string
    conn = psycopg2.connect(database_url)
    return conn

def extract_animals_from_page(page):
    """Extract all animal data from current page"""
    
    page_text = page.evaluate("() => document.body.innerText")
    
    # Parse the text to extract animals
    animals = []
    lines = page_text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for "Name:" which indicates start of an animal entry
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
            
            # Parse the next several lines for animal data
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
                    # End of animal entry
                    break
                
                i += 1
            
            if animal['breed']:  # Make sure we got a complete entry
                animals.append(animal)
        else:
            i += 1
    
    return animals

def scrape_source(page, url, source_name):
    """Scrape a single source (adoptables or fosters)"""
    
    print(f"\n{'='*60}")
    print(f"SCRAPING: {source_name}")
    print(f"URL: {url}")
    print(f"{'='*60}\n")
    
    # Load first page
    print(f"Loading: {url}\n")
    page.goto(url, wait_until="networkidle")
    time.sleep(2)
    
    print("✓ Page loaded!\n")
    
    # Extract total count
    page_text = page.evaluate("() => document.body.innerText")
    
    # Look for "Animals: X - Y of Z" pattern
    match = re.search(r'Animals:\s*(\d+)\s*-\s*(\d+)\s*of\s*(\d+)', page_text)
    if match:
        total_animals = int(match.group(3))
        print(f"Total animals available: {total_animals}\n")
    else:
        print("Could not find total count\n")
        total_animals = 0
    
    all_animals = []
    index = 0
    page_num = 1
    
    # Each page shows 30 animals, use index parameter for pagination
    while index <= total_animals:
        print(f"--- Page {page_num} (index={index}) ---")
        
        # Build URL with index parameter
        if index == 0:
            page_url = url
        else:
            page_url = f"{url}?index={index}"
        
        page.goto(page_url, wait_until="networkidle")
        time.sleep(1)
        
        # Extract animals from current page
        animals = extract_animals_from_page(page)
        print(f"Found {len(animals)} animals on this page")
        
        # Add source tag to each animal
        for animal in animals:
            animal['source'] = source_name
        
        all_animals.extend(animals)
        
        # Move to next page
        if len(animals) < 30:
            # If we got less than 30 animals, we've reached the end
            break
        
        index += 30
        page_num += 1
    
    print(f"\n✓ Scraped {len(all_animals)} total animals from {source_name}\n")
    
    return all_animals

def insert_pets_to_db(animals):
    """Insert scraped animals into PostgreSQL database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    new_pets = 0
    updated_pets = 0
    
    for animal in animals:
        try:
            # Create unique pet_id from name and source
            pet_id = f"{animal['source']}_{animal['name']}".lower().replace(' ', '_')
            
            # Use ON CONFLICT to update if exists
            cursor.execute("""
                INSERT INTO pets (pet_id, name, breed, animal_type, gender, age, source, status, first_seen, last_seen, brought_to_shelter)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, CURRENT_DATE, %s)
                ON CONFLICT (pet_id) DO UPDATE SET 
                    last_seen = CURRENT_DATE,
                    status = 'available'
                RETURNING created_at
            """, (
                pet_id,
                animal['name'],
                animal['breed'],
                animal['animal_type'],
                animal['gender'],
                animal['age'],
                animal['source'],
                'available',
                animal['brought_to_shelter']
            ))
            
            result = cursor.fetchone()
            if result:
                # Check if it's a new insert (very recent creation)
                created_at = result[0]
                now = datetime.now()
                if (now - created_at).total_seconds() < 5:
                    new_pets += 1
                else:
                    updated_pets += 1
        
        except Exception as e:
            print(f"Error inserting pet {animal.get('name')}: {str(e)}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return new_pets, updated_pets

def log_scrape_result(animals_found, new_pets, updated_pets, error=None):
    """Log scrape results to database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO scraper_logs (source, pets_found, new_pets, removed_pets, error_message)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            'BARC',
            animals_found,
            new_pets,
            0,
            error
        ))
        conn.commit()
    except Exception as e:
        print(f"Error logging scrape: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def main():
    print("🐾 Scraping BARC Adoptables AND Fosters...\n")
    
    start_time = time.time()
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_viewport_size({"width": 1280, "height": 720})
            
            # Scrape both sources
            adoptables = scrape_source(page, "https://24petconnect.com/BARCadopt", "BARC Adoptables")
            fosters = scrape_source(page, "https://24petconnect.com/BARCFosters", "BARC Fosters")
            
            browser.close()
        
        # Combine all animals
        all_animals = adoptables + fosters
        
        # Remove duplicates while preserving source info
        unique_animals = []
        seen_names = {}
        
        for animal in all_animals:
            animal_id = animal['name']
            if animal_id not in seen_names:
                seen_names[animal_id] = animal
                unique_animals.append(animal)
            else:
                # If we've seen this animal before, tag it as appearing in both
                existing = seen_names[animal_id]
                if existing.get('appears_in') is None:
                    existing['appears_in'] = [existing['source']]
                if animal['source'] not in existing['appears_in']:
                    existing['appears_in'].append(animal['source'])
        
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60 + "\n")
        
        adoptables_count = len([a for a in unique_animals if a.get('source') == 'BARC Adoptables'])
        fosters_count = len([a for a in unique_animals if a.get('source') == 'BARC Fosters'])
        both_count = len([a for a in unique_animals if a.get('appears_in') and len(a['appears_in']) > 1])
        
        print(f"Total unique animals: {len(unique_animals)}")
        print(f"  - Adoptables only: {adoptables_count - both_count}")
        print(f"  - Fosters only: {fosters_count - both_count}")
        print(f"  - In BOTH Adoptables and Fosters: {both_count}")
        
        if both_count > 0:
            print(f"\nAnimals appearing in both lists:")
            for animal in unique_animals:
                if animal.get('appears_in') and len(animal['appears_in']) > 1:
                    print(f"  • {animal['name']} - {animal['breed']}")
        
        # Insert to database
        print(f"\n{'='*60}")
        print("Inserting to database...")
        print(f"{'='*60}\n")
        
        new_pets, updated_pets = insert_pets_to_db(unique_animals)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Log results
        log_scrape_result(len(unique_animals), new_pets, updated_pets)
        
        print(f"\n{'='*60}")
        print("✓ SCRAPE COMPLETE")
        print(f"{'='*60}")
        print(f"Total animals: {len(unique_animals)}")
        print(f"New pets added: {new_pets}")
        print(f"Updated pets: {updated_pets}")
        print(f"Duration: {duration:.2f}s")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"{'='*60}\n")
        
        # Output result as JSON for Node.js to parse
        result = {
            'success': True,
            'pets_found': len(unique_animals),
            'new_pets': new_pets,
            'updated_pets': updated_pets,
            'duration': f"{duration:.2f}s",
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        log_scrape_result(0, 0, 0, str(e))
        result = {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()