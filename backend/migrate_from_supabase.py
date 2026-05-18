"""
Migrate data from Supabase PostgreSQL to local SQLite.
Reads all rows from Supabase and upserts them into the local SQLite database.
"""

import os
import sys

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# ── Connection strings ──────────────────────────
SQLITE_URL = os.getenv("DATABASE_URL", "sqlite:///./lms_training.db")
SUPABASE_URL = os.getenv("SUPABASE_DB_URL")

if not SUPABASE_URL:
    print("[ERROR] SUPABASE_DB_URL not found in .env. Cannot migrate.")
    sys.exit(1)

print(f"[INFO] Source: Supabase PostgreSQL")
print(f"[INFO] Target: {SQLITE_URL}")
print()

# ── Engines ─────────────────────────────────────
pg_engine = create_engine(SUPABASE_URL, pool_pre_ping=True)
sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

PgSession = sessionmaker(bind=pg_engine)
SqliteSession = sessionmaker(bind=sqlite_engine)

# ── Tables to migrate (in dependency order) ─────
# Order matters: parent tables first, then child tables with foreign keys
TABLES_IN_ORDER = [
    "campus_geofence",
    "hr_master_data",
    "users",
    "training_sessions",
    "session_enrollments",
    "materials",
    "session_materials",
    "question_bank",
    "assessment_sessions",
    "assessment_attempts",
    "assessment_results",
    "attendance",
    "notifications",
    "certificates",
    "flashcards",
    "session_feedback",
    "courses",
    "course_materials",
    "course_enrollments",
    "practical_scores",
    "proctoring_snapshots",
    "supervisor_sessions",
    "sync_queue",
]

def get_table_columns(engine, table_name):
    """Get column names for a table."""
    insp = inspect(engine)
    try:
        cols = insp.get_columns(table_name)
        return [c["name"] for c in cols]
    except Exception:
        return []

def table_exists(engine, table_name):
    """Check if a table exists."""
    insp = inspect(engine)
    return table_name in insp.get_table_names()

def migrate_table(table_name, pg_sess, sqlite_sess):
    """Migrate a single table from Supabase to SQLite."""
    # Check if table exists on both sides
    if not table_exists(pg_engine, table_name):
        print(f"  [SKIP] '{table_name}' does not exist in Supabase. Skipping.")
        return 0
    if not table_exists(sqlite_engine, table_name):
        print(f"  [SKIP] '{table_name}' does not exist in SQLite. Skipping.")
        return 0

    # Get columns that exist in BOTH databases
    pg_cols = set(get_table_columns(pg_engine, table_name))
    sqlite_cols = set(get_table_columns(sqlite_engine, table_name))
    common_cols = sorted(pg_cols & sqlite_cols)

    if not common_cols:
        print(f"  [SKIP] '{table_name}' has no common columns. Skipping.")
        return 0

    # Read all rows from Supabase
    cols_str = ", ".join([f'"{c}"' for c in common_cols])
    try:
        rows = pg_sess.execute(text(f'SELECT {cols_str} FROM "{table_name}"')).fetchall()
    except Exception as e:
        print(f"  [ERROR] Failed to read '{table_name}' from Supabase: {e}")
        return 0

    if not rows:
        print(f"  [SKIP] '{table_name}' is empty in Supabase.")
        return 0

    # Clear existing data in SQLite for this table
    try:
        sqlite_sess.execute(text(f'DELETE FROM "{table_name}"'))
    except Exception as e:
        print(f"  [WARN] Could not clear '{table_name}' in SQLite: {e}")

    # Insert rows into SQLite
    placeholders = ", ".join([f":{c}" for c in common_cols])
    insert_sql = f'INSERT OR REPLACE INTO "{table_name}" ({cols_str}) VALUES ({placeholders})'

    inserted = 0
    for row in rows:
        row_dict = {}
        for i, col in enumerate(common_cols):
            val = row[i]
            # Convert any non-SQLite-compatible types
            if isinstance(val, (list, dict)):
                import json
                val = json.dumps(val)
            row_dict[col] = val
        try:
            sqlite_sess.execute(text(insert_sql), row_dict)
            inserted += 1
        except Exception as e:
            print(f"  [WARN] Failed to insert row into '{table_name}': {e}")

    return inserted


def main():
    print("=" * 60)
    print("  SUPABASE -> SQLITE DATA MIGRATION")
    print("=" * 60)
    print()

    pg_sess = PgSession()
    sqlite_sess = SqliteSession()

    total_migrated = 0

    for table_name in TABLES_IN_ORDER:
        print(f"[MIGRATING] {table_name}...")
        count = migrate_table(table_name, pg_sess, sqlite_sess)
        if count > 0:
            print(f"  [OK] {count} rows migrated.")
            total_migrated += count

    # Commit all changes
    try:
        sqlite_sess.commit()
        print()
        print("=" * 60)
        print(f"  MIGRATION COMPLETE: {total_migrated} total rows migrated.")
        print("=" * 60)
    except Exception as e:
        sqlite_sess.rollback()
        print(f"\n[ERROR] Failed to commit: {e}")
    finally:
        pg_sess.close()
        sqlite_sess.close()


if __name__ == "__main__":
    main()
