import os
import shutil
import sqlite3
from datetime import datetime
import asyncio

BACKUP_DIR = "backups"
DB_PATH = "training.db"

async def create_backup():
    """
    Creates a consistent snapshot of the SQLite database.
    Uses 'VACUUM INTO' to create a backup file without locking the DB for long.
    """
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"training_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    try:
        # Use a temporary connection to perform the backup
        # VACUUM INTO is available in SQLite 3.27.0+
        conn = sqlite3.connect(DB_PATH)
        conn.execute(f"VACUUM INTO '{backup_path}'")
        conn.close()
        
        print(f"[Backup] Success: {backup_path}")
        
        # Cleanup old backups (keep last 7 days)
        await cleanup_old_backups()
        
        return backup_path
    except Exception as e:
        print(f"[Backup] Failed: {e}")
        return None

async def cleanup_old_backups(keep_count=7):
    """Keep only the most recent N backups."""
    try:
        files = [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.endswith(".db")]
        files.sort(key=os.path.getmtime, reverse=True)
        
        if len(files) > keep_count:
            for old_file in files[keep_count:]:
                os.remove(old_file)
                print(f"[Backup] Cleaned up: {old_file}")
    except Exception as e:
        print(f"[Backup] Cleanup failed: {e}")

async def backup_scheduler():
    """Background task to run backups daily."""
    while True:
        # Run backup
        await create_backup()
        # Wait for 24 hours (86400 seconds)
        await asyncio.sleep(86400)
