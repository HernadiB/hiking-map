import * as SQLite from 'expo-sqlite';

import type { AppLanguage } from '../types/hikes';

type SettingRow = {
  value: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let schemaReady = false;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('hiking-map.db');
  }

  return databasePromise;
}

async function initializeSettingsStore(): Promise<void> {
  if (schemaReady) {
    return;
  }

  const database = await getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  schemaReady = true;
}

export async function getPreferredLanguage(): Promise<AppLanguage | null> {
  await initializeSettingsStore();
  const database = await getDatabase();
  const row = await database.getFirstAsync<SettingRow>(
    `SELECT value FROM app_settings WHERE key = 'preferred_language' LIMIT 1`
  );

  if (!row || (row.value !== 'en' && row.value !== 'hu')) {
    return null;
  }

  return row.value;
}

export async function setPreferredLanguage(language: AppLanguage): Promise<void> {
  await initializeSettingsStore();
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('preferred_language', ?)`,
    language
  );
}
