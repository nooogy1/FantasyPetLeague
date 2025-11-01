#!/usr/bin/env python3
"""
Breed points management utility
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def list_breed_points():
    """List all breed point values"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT breed, points FROM breed_points ORDER BY breed")
    rows = cur.fetchall()
    
    cur.close()
    conn.close()
    
    print("\nBREED POINTS:")
    print("-" * 50)
    for row in rows:
        print(f"{row['breed']:40s} : {row['points']} points")
    print()

def set_breed_points(breed, points):
    """Set points for a breed"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO breed_points (breed, points)
            VALUES (%s, %s)
            ON CONFLICT (breed)
            DO UPDATE SET points = %s, updated_at = NOW()
        """, (breed, points, points))
        
        conn.commit()
        print(f"✓ Set {breed} to {points} points")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def initialize_default_points():
    """Initialize all breeds with default 1 point"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get all unique breeds from pets table
        cur.execute("SELECT DISTINCT breed FROM pets WHERE breed IS NOT NULL ORDER BY breed")
        breeds = cur.fetchall()
        
        # Insert or update each breed to 1 point
        for row in breeds:
            breed = row['breed']
            cur.execute("""
                INSERT INTO breed_points (breed, points)
                VALUES (%s, 1)
                ON CONFLICT (breed)
                DO NOTHING
            """, (breed,))
        
        conn.commit()
        print(f"✓ Initialized {len(breeds)} breeds with default 1 point")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def get_breed_points(breed):
    """Get points for a specific breed"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT points FROM breed_points WHERE breed = %s", (breed,))
    row = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if row:
        return row['points']
    else:
        return 1  # Default

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list":
            list_breed_points()
        elif command == "init":
            initialize_default_points()
        elif command == "set" and len(sys.argv) >= 4:
            breed = sys.argv[2]
            points = int(sys.argv[3])
            set_breed_points(breed, points)
        else:
            print("""
Usage:
  python breed_points.py list                    # Show all breed points
  python breed_points.py init                    # Initialize all breeds to 1 point
  python breed_points.py set <breed> <points>   # Set points for a breed
  
Example:
  python breed_points.py set "German Shepherd Dog mix" 5
            """)
    else:
        list_breed_points()
