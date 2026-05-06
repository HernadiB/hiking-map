import Constants from 'expo-constants';

import { parseGpxDocument } from './gpx';
import { sortHikes } from './hike-records';
import type {
  HikeRecord,
  HikeSourceType,
  PublicHikeRecordFeed,
  PublicHikeReference,
  PublicHikeReferenceFeed,
  PublicHikeFeed,
} from '../types/hikes';

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

function isPublicHikeReferenceEntry(value: unknown): value is PublicHikeReference {
  return (
    typeof value === 'string' ||
    (typeof value === 'object' &&
      value !== null &&
      typeof (value as { gpxPath?: unknown }).gpxPath === 'string')
  );
}

function isPublicHikeReferenceArray(value: unknown): value is PublicHikeReference[] {
  return Array.isArray(value) && value.every(isPublicHikeReferenceEntry);
}

function getFileNameFromPath(value: string): string {
  const normalizedValue = value.split('?')[0]?.split('#')[0] ?? value;
  return normalizedValue.split('/').filter(Boolean).pop() ?? 'Imported hike.gpx';
}

function formatFallbackTitle(value: string): string {
  const normalizedValue = getFileNameFromPath(value)
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return normalizedValue || 'Imported hike';
}

function createStablePublicHikeId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  let hash = 5381;

  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }

  const normalizedHash = (hash >>> 0).toString(36);
  return `public_${slug || 'hike'}_${normalizedHash}`;
}

function resolvePublicAssetUrl(assetPath: string, feedUrl: string): string {
  return new URL(assetPath, feedUrl).toString();
}

function readReferencePath(reference: PublicHikeReference): string {
  return typeof reference === 'string' ? reference : reference.gpxPath;
}

function readReferenceSourceType(referencePath: string, sourceType?: HikeSourceType): HikeSourceType {
  if (sourceType) {
    return sourceType;
  }

  return /^https?:\/\//i.test(referencePath) ? 'url' : 'file';
}

async function fetchTextDocument(url: string): Promise<{ text: string; finalUrl: string }> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/gpx+xml, application/xml, text/xml, text/plain;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`The public GPX file returned ${response.status}: ${url}`);
  }

  return {
    text: await response.text(),
    finalUrl: response.url || url,
  };
}

async function buildHikeRecordFromReference(
  reference: PublicHikeReference,
  feedUrl: string,
  updatedAt: string
): Promise<HikeRecord> {
  const referencePath = readReferencePath(reference);
  const resolvedGpxUrl = resolvePublicAssetUrl(referencePath, feedUrl);
  const { text, finalUrl } = await fetchTextDocument(resolvedGpxUrl);
  const fallbackTitle =
    typeof reference === 'string'
      ? formatFallbackTitle(referencePath)
      : reference.title ?? formatFallbackTitle(referencePath);
  const draft = parseGpxDocument(text, {
    fallbackTitle,
    sourceType: readReferenceSourceType(
      referencePath,
      typeof reference === 'string' ? undefined : reference.sourceType
    ),
    sourceValue:
      typeof reference === 'string'
        ? referencePath
        : reference.sourceValue ?? referencePath,
  });

  return {
    ...draft,
    id:
      typeof reference === 'string'
        ? createStablePublicHikeId(referencePath)
        : reference.id ?? createStablePublicHikeId(referencePath),
    title:
      typeof reference === 'string'
        ? draft.title
        : reference.title?.trim() || draft.title,
    createdAt:
      typeof reference === 'string'
        ? updatedAt
        : reference.createdAt?.trim() || updatedAt,
    sourceValue:
      typeof reference === 'string'
        ? referencePath
        : reference.sourceValue?.trim() || finalUrl,
  };
}

async function buildHikeRecordsFromReferenceFeed(
  feed: PublicHikeReferenceFeed,
  feedUrl: string
): Promise<PublicHikeRecordFeed> {
  const hikes = await Promise.all(
    feed.hikes.map((reference) => buildHikeRecordFromReference(reference, feedUrl, feed.updatedAt))
  );

  return {
    version: 1,
    updatedAt: feed.updatedAt,
    hikes: sortHikes(hikes),
  };
}

export function buildPublicHikeFeed(hikes: HikeRecord[]): PublicHikeRecordFeed {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    hikes: sortHikes(hikes),
  };
}

export function serializePublicHikeFeed(hikes: HikeRecord[]): string {
  return JSON.stringify(buildPublicHikeFeed(hikes), null, 2);
}

export async function fetchPublicHikeFeed(): Promise<PublicHikeRecordFeed> {
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

  if (payload.version === 1 && isHikeRecordArray(payload.hikes)) {
    return {
      version: 1,
      updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
      hikes: sortHikes(payload.hikes),
    };
  }

  if (payload.version === 2 && isPublicHikeReferenceArray(payload.hikes)) {
    return buildHikeRecordsFromReferenceFeed(
      {
        version: 2,
        updatedAt:
          typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
        hikes: payload.hikes,
      },
      response.url || getPublicHikesFeedUrl()
    );
  }

  if (!('version' in payload)) {
    throw new Error('The public hikes feed has an invalid format.');
  }

  throw new Error('The public hikes feed has an invalid format.');
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
