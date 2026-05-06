import { isReadOnlyMode } from './app-features';
import { buildStoredHike, sortHikes, toHikeSummary } from './hike-records';
import { fetchPublicHikeFeed } from './public-hikes-feed';
import type { HikeDraft, HikeRecord, HikeSummary } from '../types/hikes';

const STORAGE_KEY = 'hiking-map.hikes.v1';
let publicHikesPromise: Promise<HikeRecord[]> | null = null;

function readStoredHikes(): HikeRecord[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    return sortHikes(JSON.parse(rawValue) as HikeRecord[]);
  } catch {
    return [];
  }
}

function writeStoredHikes(hikes: HikeRecord[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortHikes(hikes)));
}

async function readPublicHikes(): Promise<HikeRecord[]> {
  if (!publicHikesPromise) {
    publicHikesPromise = fetchPublicHikeFeed().then((feed) => sortHikes(feed.hikes));
  }

  return publicHikesPromise;
}

export async function initializeHikeStore(): Promise<void> {
  if (isReadOnlyMode()) {
    await readPublicHikes();
  }
}

export async function listHikes(): Promise<HikeSummary[]> {
  if (isReadOnlyMode()) {
    return (await readPublicHikes()).map(toHikeSummary);
  }

  return readStoredHikes().map(toHikeSummary);
}

export async function listHikeRecords(): Promise<HikeRecord[]> {
  if (isReadOnlyMode()) {
    return readPublicHikes();
  }

  return readStoredHikes();
}

export async function getHikeById(id: string): Promise<HikeRecord | null> {
  if (isReadOnlyMode()) {
    return (await readPublicHikes()).find((hike) => hike.id === id) ?? null;
  }

  return readStoredHikes().find((hike) => hike.id === id) ?? null;
}

export async function saveHike(draft: HikeDraft): Promise<HikeRecord> {
  const hike = buildStoredHike(draft);
  const hikes = readStoredHikes();
  hikes.unshift(hike);
  writeStoredHikes(hikes);
  return hike;
}
