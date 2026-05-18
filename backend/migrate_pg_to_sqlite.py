"""
Migrate all data from Supabase PostgreSQL to local SQLite.
Reads from current DATABASE_URL (PostgreSQL) and writes to lms_training.db.
"""
import os
import sys
import json
import sqlite3
from datetime import datetime

# Force PostgreSQL connection for reading
PG_URL = "postgresql+psycopg://postgres.qnndqowtocscumrijjts:Sansy_7626**@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'lms_training.db')

from sqlalchemy import create_engine, text, inspect

# Connect to PostgreSQL (source)
pg_engine = create_engine(PG_URL, echo=False)

# Connect to SQLite (target)  
sqlite_engine = create_engine(f"sqlite:///{SQLITE_PATH}", echo=False, connect_args={"check_same_thread": False})

# Tables to migrate in order (respecting foreign key dependencies)
TABLES_IN_ORDER = [
    "campus_geofence",
    "users",
    "hr_master_data",
    "training_sessions",
    "session_enrollments",
    "modules",
    "materials",
    "session_materials",
    "attendance",
    "question_bank",
    "assessment_sessions",
    "assessment_attempts",
    "assessment_results",
    "practical_scores",
    "certificates",
    "session_feedback",
    "flashcards",
    "notifications",
    "supervisor_sessions",
    "sync_queue",
    "proctoring_snapshots",
]

def get_pg_tables(pg_conn):
    """Get list of tables that exist in PostgreSQL public schema."""
    result = pg_conn.execute(text(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    ))
    return [row[0] for row in result.fetchall()]

def get_sqlite_tables(sqlite_conn):
    """Get list of tables in SQLite."""
    result = sqlite_conn.execute(text(
        "SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version'"
    ))
    return [row[0] for row in result.fetchall()]

def serialize_value(val):
    """Convert Python objects to SQLite-compatible types."""
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    if isinstance(val, datetime):
        return val.isoformat()
    return val

def migrate_table(pg_conn, sqlite_conn, table_name):
    """Migrate all rows from a PostgreSQL table to SQLite."""
    try:
        # Check if table exists in PostgreSQL
        rows = pg_conn.execute(text(f'SELECT * FROM "{table_name}"')).fetchall()
        if not rows:
            print(f"  {table_name}: 0 rows (empty, skipping)")
            return 0

        # Get column names
        keys = rows[0]._mapping.keys()
        columns = list(keys)
        
        # Clear existing SQLite data for this table
        sqlite_conn.execute(text(f'DELETE FROM "{table_name}"'))
        
        # Insert rows
        count = 0
        for row in rows:
            values = {col: serialize_value(row._mapping[col]) for col in columns}
            placeholders = ", ".join([f":{col}" for col in columns])
            col_names = ", ".join([f'"{col}"' for col in columns])
            
            try:
                sqlite_conn.execute(
                    text(f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'),
                    values
                )
                count += 1
            except Exception as row_err:
                print(f"    WARNING: Skipped row in {table_name}: {row_err}")
        
        sqlite_conn.commit()
        print(f"  {table_name}: {count} rows migrated")
        return count
        
    except Exception as e:
        print(f"  {table_name}: ERROR - {e}")
        return 0

def main():
    print("=" * 60)
    print("SUPABASE POSTGRESQL -> LOCAL SQLITE MIGRATION")
    print("=" * 60)
    
    print(f"\nSource: Supabase PostgreSQL")
    print(f"Target: {SQLITE_PATH}")
    
    # Get available tables from PostgreSQL
    with pg_engine.connect() as pg_conn:
        pg_tables = get_pg_tables(pg_conn)
        print(f"\nPostgreSQL tables found: {len(pg_tables)}")
        for t in pg_tables:
            count = pg_conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).fetchone()[0]
            print(f"  {t}: {count} rows")
    
    # Migrate in order
    print(f"\n--- MIGRATING DATA ---")
    total_rows = 0
    
    with pg_engine.connect() as pg_conn:
        with sqlite_engine.connect() as sqlite_conn:
            # Disable foreign key checks during migration
            sqlite_conn.execute(text("PRAGMA foreign_keys = OFF"))
            
            for table in TABLES_IN_ORDER:
                if table in pg_tables:
                    rows = migrate_table(pg_conn, sqlite_conn, table)
                    total_rows += rows
                else:
                    print(f"  {table}: NOT IN PostgreSQL (skipping)")
            
            # Re-enable foreign keys
            sqlite_conn.execute(text("PRAGMA foreign_keys = ON"))
            sqlite_conn.commit()
    
    print(f"\n{'=' * 60}")
    print(f"MIGRATION COMPLETE: {total_rows} total rows migrated")
    print(f"{'=' * 60}")
    
    # Verify
    print(f"\n--- VERIFICATION ---")
    conn = sqlite3.connect(SQLITE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version' ORDER BY name")
    for (tbl,) in cursor.fetchall():
        cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
        count = cursor.fetchone()[0]
        print(f"  {tbl}: {count} rows")
    conn.close()

if __name__ == "__main__":
    main()
