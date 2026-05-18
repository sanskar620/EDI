"""
Import all Supabase CSV exports into local SQLite database.
Maps each numbered CSV to its correct table.
"""
import csv
import sqlite3
import os
import json

DATA_DIR = r"c:\EDI-4 by om\DATA"
SQLITE_PATH = r"c:\EDI-4 by om\backend\lms_training.db"

# Mapping: CSV filename -> SQLite table name
CSV_TO_TABLE = {
    "Supabase Snippet List Public Tables.csv": "courses",                    # courses (custom table)
    "Supabase Snippet List Public Tables (1).csv": "course_materials",       # course_materials
    "Supabase Snippet List Public Tables (2).csv": "course_enrollments",     # course_enrollments
    "Supabase Snippet List Public Tables (3).csv": "course_enrollments_dup", # duplicate - skip
    "Supabase Snippet List Public Tables (4).csv": "alembic_version",       # alembic_version
    "Supabase Snippet List Public Tables (5).csv": "modules",               # modules (with course_id)
    "Supabase Snippet List Public Tables (6).csv": "training_sessions",     # training_sessions
    "Supabase Snippet List Public Tables (7).csv": "hr_master_data",        # hr_master_data
    "Supabase Snippet List Public Tables (8).csv": "session_enrollments",   # session_enrollments
    "Supabase Snippet List Public Tables (9).csv": "materials",             # materials
    "Supabase Snippet List Public Tables (10).csv": "campus_geofence",      # campus_geofence
    "Supabase Snippet List Public Tables (11).csv": "users",                # users
    "Supabase Snippet List Public Tables (12).csv": "attendance",           # attendance
    "Supabase Snippet List Public Tables (13).csv": "assessment_sessions",  # assessment_sessions
    "Supabase Snippet List Public Tables (14).csv": "notifications",        # notifications
    "Supabase Snippet List Public Tables (15).csv": "assessment_attempts",  # assessment_attempts
    "Supabase Snippet List Public Tables (16).csv": "question_bank",        # question_bank
    "Supabase Snippet List Public Tables (17).csv": "assessment_results",   # assessment_results
}

# Tables that don't exist in SQLite and need to be created
NEW_TABLES = {
    "courses": """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            topic TEXT,
            trainer_id INTEGER,
            status TEXT DEFAULT 'DRAFT',
            thumbnail_url TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """,
    "course_materials": """
        CREATE TABLE IF NOT EXISTS course_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            title TEXT NOT NULL,
            material_type TEXT,
            content_url TEXT,
            quiz_data TEXT,
            description TEXT,
            duration_seconds INTEGER,
            order_index INTEGER DEFAULT 0,
            created_at TEXT
        )
    """,
    "course_enrollments": """
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            user_id INTEGER,
            progress REAL DEFAULT 0,
            status TEXT DEFAULT 'ENROLLED',
            enrolled_at TEXT,
            completed_at TEXT
        )
    """,
}

# Skip these
SKIP_TABLES = {"course_enrollments_dup", "alembic_version"}

def clean_value(val, col_name=""):
    """Convert CSV values to SQLite-compatible types."""
    if val == "" or val == "null" or val == "NULL":
        return None
    if val == "true":
        return 1
    if val == "false":
        return 0
    return val

def import_csv(conn, csv_path, table_name):
    """Import a single CSV file into a SQLite table."""
    cursor = conn.cursor()
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        if not headers:
            print(f"  {table_name}: NO HEADERS (skipping)")
            return 0
        
        # Get existing columns in SQLite table
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_cols = {row[1] for row in cursor.fetchall()}
        
        # Filter headers to only columns that exist in the table
        valid_headers = [h for h in headers if h in existing_cols]
        skipped_headers = [h for h in headers if h not in existing_cols]
        
        if skipped_headers:
            print(f"  {table_name}: Skipping columns not in schema: {skipped_headers}")
        
        if not valid_headers:
            print(f"  {table_name}: NO MATCHING COLUMNS (skipping)")
            return 0
        
        # Clear existing data
        cursor.execute(f"DELETE FROM {table_name}")
        
        # Insert rows
        count = 0
        for row in reader:
            values = [clean_value(row.get(h, None), h) for h in valid_headers]
            placeholders = ", ".join(["?" for _ in valid_headers])
            col_names = ", ".join([f'"{h}"' for h in valid_headers])
            
            try:
                cursor.execute(f'INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})', values)
                count += 1
            except Exception as e:
                print(f"    ROW ERROR in {table_name}: {e}")
        
        conn.commit()
        return count

def main():
    print("=" * 60)
    print("IMPORTING SUPABASE CSV DATA INTO SQLITE")
    print("=" * 60)
    
    conn = sqlite3.connect(SQLITE_PATH)
    cursor = conn.cursor()
    
    # Disable foreign keys during import
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    # Create new tables that don't exist yet
    for table_name, create_sql in NEW_TABLES.items():
        print(f"Creating table if not exists: {table_name}")
        cursor.execute(create_sql)
    conn.commit()
    
    # Import each CSV
    total_rows = 0
    for csv_file, table_name in CSV_TO_TABLE.items():
        if table_name in SKIP_TABLES:
            print(f"  SKIPPING: {csv_file}")
            continue
            
        csv_path = os.path.join(DATA_DIR, csv_file)
        if not os.path.exists(csv_path):
            print(f"  FILE NOT FOUND: {csv_file}")
            continue
        
        rows = import_csv(conn, csv_path, table_name)
        total_rows += rows
        print(f"  OK {table_name}: {rows} rows imported from {csv_file}")
    
    # Re-enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    
    # Final verification
    print(f"\n{'=' * 60}")
    print(f"IMPORT COMPLETE: {total_rows} total rows imported")
    print(f"{'=' * 60}")
    
    print("\n--- FINAL TABLE STATE ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version' ORDER BY name")
    for (tbl,) in cursor.fetchall():
        cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"  {tbl}: {count} rows")
    
    conn.close()

if __name__ == "__main__":
    main()
