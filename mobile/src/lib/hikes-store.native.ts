import * as SQLite from 'expo-sqlite';

import { buildStoredHike, toHikeSummary } from './hike-records';
import type { HikeBounds, HikeDraft, HikePoint, HikeRecord, HikeSourceType, HikeSummary } from '../types/hikes';

type HikeRow = {
  id: string;
  title: string;
  source_type: HikeSourceType;
  source_value: string;
  distance_meters: number;
  elevation_gain_meters: number;
  duration_seconds: number | null;
  started_at: string | null;
  created_at: string;
  bounds_json: string;
  points_json: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let schemaReady = false;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('hiking-map.db');
  }

  return databasePromise;
}

function mapRowToHike(row: HikeRow): HikeRecord {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    sourceValue: row.source_value,
    distanceMeters: row.distance_meters,
    elevationGainMeters: row.elevation_gain_meters,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    createdAt: row.created_at,
    bounds: JSON.parse(row.bounds_json) as HikeBounds,
    points: JSON.parse(row.points_json) as HikePoint[],
  };
}

export async function initializeHikeStore(): Promise<void> {
  if (schemaReady) {
    return;
  }

  const database = await getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS hikes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_value TEXT NOT NULL,
      distance_meters REAL NOT NULL,
      elevation_gain_meters REAL NOT NULL,
      duration_seconds INTEGER,
      started_at TEXT,
      created_at TEXT NOT NULL,
      bounds_json TEXT NOT NULL,
      points_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS hikes_started_at_idx
      ON hikes (started_at DESC, created_at DESC);
  `);
  schemaReady = true;
}

export async function listHikes(): Promise<HikeSummary[]> {
  await initializeHikeStore();
  const database = await getDatabase();
  const rows = await database.getAllAsync<HikeRow>(
    `SELECT * FROM hikes ORDER BY COALESCE(started_at, created_at) DESC, created_at DESC`
  );

  return rows.map(mapRowToHike).map(toHikeSummary);
}

export async function listHikeRecords(): Promise<HikeRecord[]> {
  await initializeHikeStore();
  const database = await getDatabase();
  const rows = await database.getAllAsync<HikeRow>(
    `SELECT * FROM hikes ORDER BY COALESCE(started_at, created_at) DESC, created_at DESC`
  );

  return rows.map(mapRowToHike);
}

export async function getHikeById(id: string): Promise<HikeRecord | null> {
  await initializeHikeStore();
  const database = await getDatabase();
  const row = await database.getFirstAsync<HikeRow>(`SELECT * FROM hikes WHERE id = ? LIMIT 1`, id);

  return row ? mapRowToHike(row) : null;
}

export async function saveHike(draft: HikeDraft): Promise<HikeRecord> {
  await initializeHikeStore();
  const database = await getDatabase();
  const hike = buildStoredHike(draft);

  await database.runAsync(
    `INSERT INTO hikes (
      id,
      title,
      source_type,
      source_value,
      distance_meters,
      elevation_gain_meters,
      duration_seconds,
      started_at,
      created_at,
      bounds_json,
      points_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    hike.id,
    hike.title,
    hike.sourceType,
    hike.sourceValue,
    hike.distanceMeters,
    hike.elevationGainMeters,
    hike.durationSeconds,
    hike.startedAt,
    hike.createdAt,
    JSON.stringify(hike.bounds),
    JSON.stringify(hike.points)
  );

  return hike;
}
