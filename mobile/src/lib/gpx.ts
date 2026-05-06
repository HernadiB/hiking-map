import { XMLParser } from 'fast-xml-parser';

import {
  calculateDistanceMeters,
  calculateDurationSeconds,
  calculateElevationGainMeters,
  getBounds,
} from './geo';
import type { HikeDraft, HikePoint, HikeSourceType } from '../types/hikes';

type GpxParseOptions = {
  fallbackTitle: string;
  sourceType: HikeSourceType;
  sourceValue: string;
};

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function formatFallbackTitle(value: string): string {
  const normalizedValue = value.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return normalizedValue || 'Imported hike';
}

function parseTrackPoint(node: Record<string, unknown>): HikePoint | null {
  const latitude = Number(node.lat);
  const longitude = Number(node.lon ?? node.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const elevationValue = node.ele === undefined ? null : Number(node.ele);

  return {
    latitude,
    longitude,
    elevationMeters: Number.isFinite(elevationValue) ? elevationValue : null,
    recordedAt: asString(node.time) ?? null,
  };
}

function extractTrackPoints(tracks: Record<string, unknown>[]): HikePoint[] {
  return tracks.flatMap((track) =>
    asArray(track.trkseg as Record<string, unknown>[]).flatMap((segment) =>
      asArray(segment.trkpt as Record<string, unknown>[]).flatMap((point) => {
        const parsedPoint = parseTrackPoint(point);
        return parsedPoint ? [parsedPoint] : [];
      })
    )
  );
}

function extractRoutePoints(routes: Record<string, unknown>[]): HikePoint[] {
  return routes.flatMap((route) =>
    asArray(route.rtept as Record<string, unknown>[]).flatMap((point) => {
      const parsedPoint = parseTrackPoint(point);
      return parsedPoint ? [parsedPoint] : [];
    })
  );
}

export function parseGpxDocument(xmlText: string, options: GpxParseOptions): HikeDraft {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: false,
    trimValues: true,
  });
  const parsedDocument = parser.parse(xmlText) as Record<string, unknown>;
  const gpxRoot = parsedDocument.gpx as Record<string, unknown> | undefined;

  if (!gpxRoot) {
    throw new Error('The imported file is not a valid GPX document.');
  }

  const tracks = asArray(gpxRoot.trk as Record<string, unknown>[]);
  const routes = asArray(gpxRoot.rte as Record<string, unknown>[]);
  const metadata = (gpxRoot.metadata as Record<string, unknown> | undefined) ?? {};
  const points = extractTrackPoints(tracks);
  const resolvedPoints = points.length >= 2 ? points : extractRoutePoints(routes);

  if (resolvedPoints.length < 2) {
    throw new Error('The GPX file does not contain enough route points.');
  }

  const trackName = asString(tracks[0]?.name);
  const routeName = asString(routes[0]?.name);
  const metadataName = asString(metadata.name);
  const title = trackName ?? routeName ?? metadataName ?? formatFallbackTitle(options.fallbackTitle);

  return {
    title,
    sourceType: options.sourceType,
    sourceValue: options.sourceValue,
    distanceMeters: calculateDistanceMeters(resolvedPoints),
    elevationGainMeters: calculateElevationGainMeters(resolvedPoints),
    durationSeconds: calculateDurationSeconds(resolvedPoints),
    startedAt: resolvedPoints.find((point) => point.recordedAt)?.recordedAt ?? null,
    bounds: getBounds(resolvedPoints),
    points: resolvedPoints,
  };
}
