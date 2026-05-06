import type { HikeDraft, HikeRecord, HikeSummary } from '../types/hikes';

function createHikeId(): string {
  return `hike_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSortTimestamp(record: Pick<HikeRecord, 'startedAt' | 'createdAt'>): number {
  return Date.parse(record.startedAt ?? record.createdAt);
}

export function buildStoredHike(draft: HikeDraft): HikeRecord {
  return {
    ...draft,
    id: createHikeId(),
    createdAt: new Date().toISOString(),
  };
}

export function toHikeSummary(record: HikeRecord): HikeSummary {
  const { points, ...summary } = record;

  return {
    ...summary,
    pointCount: points.length,
  };
}

export function sortHikes(records: HikeRecord[]): HikeRecord[] {
  return [...records].sort((left, right) => getSortTimestamp(right) - getSortTimestamp(left));
}
