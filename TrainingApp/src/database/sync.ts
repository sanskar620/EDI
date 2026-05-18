import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { dbName } from './db';

const BACKEND_URL = 'http://192.168.0.104:8000/api/v1/sync'; // Set to PC IP for Expo testing

export const runSyncWorker = async () => {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    console.log('Offline. Skipping sync.');
    return;
  }

  const db = await SQLite.openDatabaseAsync(dbName);

  // 1. PUSH local changes to Server
  const pendingItems = await db.getAllAsync(
    "SELECT * FROM SyncQueue WHERE status = 'PENDING'"
  );

  if (pendingItems.length > 0) {
    try {
      const payload = {
        items: pendingItems.map((item: any) => ({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          payload: JSON.parse(item.payload),
          device_timestamp: item.device_timestamp
        }))
      };

      const res = await fetch(`${BACKEND_URL}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Mark locally synced
        await db.runAsync("UPDATE SyncQueue SET status = 'SYNCED' WHERE status = 'PENDING'");
        console.log('Successfully pushed offline data.');
      }
    } catch (e) {
      console.error('Push sync failed', e);
    }
  }

  // 2. PULL new changes from Server
  try {
    const lastSyncTime = new Date(Date.now() - 86400000).toISOString(); // Simplified for MVP: Last 24hrs
    const res = await fetch(`${BACKEND_URL}/pull?last_sync_timestamp=${lastSyncTime}`);
    
    if (res.ok) {
      const data = await res.json();
      
      // Upsert pulled data into local SQLite tables
      // E.g. data.new_sessions.forEach(session => db.runAsync('INSERT OR REPLACE INTO Sessions ...'))
      console.log('Successfully pulled online data.', data);
    }
  } catch (e) {
    console.error('Pull sync failed', e);
  }
};
