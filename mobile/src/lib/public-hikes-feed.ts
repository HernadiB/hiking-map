import Constants from 'expo-constants';

import { sortHikes } from './hike-records';
import type { HikeRecord, PublicHikeFeed } from '../types/hikes';

const DEFAULT_PUBLIC_HIKES_FEED_URL = '/data/public-hikes.json';

function getPublicHikesFeedUrl(): string {
  const configuredUrl = Constants.expoConfig?.extra?.publicHikesFeedUrl;
  return typeof configuredUrl === 'string' && configuredUrl.trim()
    ? configuredUrl
    : DEFAULT_PUBLIC_HIKES_FEED_URL;
}

function isHikeRecordArray(value: unknown): value is HikeRecord[] {
  return Array.isArray(value);
}

export function buildPublicHikeFeed(hikes: HikeRecord[]): PublicHikeFeed {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    hikes: sortHikes(hikes),
  };
}

export function serializePublicHikeFeed(hikes: HikeRecord[]): string {
  return JSON.stringify(buildPublicHikeFeed(hikes), null, 2);
}

export async function fetchPublicHikeFeed(): Promise<PublicHikeFeed> {
  const response = await fetch(getPublicHikesFeedUrl(), {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`The public hikes feed returned ${response.status}.`);
  }

  const payload = (await response.json()) as Partial<PublicHikeFeed> | HikeRecord[];

  if (isHikeRecordArray(payload)) {
    return buildPublicHikeFeed(payload);
  }

  if (payload.version !== 1 || !isHikeRecordArray(payload.hikes)) {
    throw new Error('The public hikes feed has an invalid format.');
  }

  return {
    version: 1,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    hikes: sortHikes(payload.hikes),
  };
}

export function downloadPublicHikeFeed(hikes: HikeRecord[]): void {
  if (typeof document === 'undefined') {
    throw new Error('Public feed export is available only in the browser.');
  }

  const blob = new Blob([serializePublicHikeFeed(hikes)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'public-hikes.json';
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
