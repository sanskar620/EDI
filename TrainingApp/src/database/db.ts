import * as SQLite from 'expo-sqlite';

export const dbName = 'lms_offline.db';

export const initDb = async () => {
  const db = await SQLite.openDatabaseAsync(dbName);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS SyncQueue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      device_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Sessions (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      scheduled_date DATETIME NOT NULL,
      topic TEXT,
      trainer_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Enrollments (
      id INTEGER PRIMARY KEY,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'INVITED'
    );
      
    CREATE TABLE IF NOT EXISTS Attendance (
      id INTEGER PRIMARY KEY,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      check_in_time DATETIME
    );
  `);
  
  return db;
};

// Example function to insert into sync queue locally
export const queueSyncAction = async (entityType: string, payload: any) => {
  const db = await SQLite.openDatabaseAsync(dbName);
  await db.runAsync(
    'INSERT INTO SyncQueue (entity_type, payload) VALUES (?, ?)',
    [entityType, JSON.stringify(payload)]
  );
};
