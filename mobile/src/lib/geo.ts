import type { LatLng, Region } from 'react-native-maps';

import type {
  ElevationProfilePoint,
  HikeBounds,
  HikePoint,
  HikeRecord,
  RoutePreview,
} from '../types/hikes';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculatePointDistanceMeters(previous: HikePoint, current: HikePoint): number {
  const latitudeDelta = toRadians(current.latitude - previous.latitude);
  const longitudeDelta = toRadians(current.longitude - previous.longitude);
  const latitudeA = toRadians(previous.latitude);
  const latitudeB = toRadians(current.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function calculateDistanceMeters(points: HikePoint[]): number {
  let totalDistance = 0;

  for (let index = 1; index < points.length; index += 1) {
    totalDistance += calculatePointDistanceMeters(points[index - 1], points[index]);
  }

  return totalDistance;
}

export function calculateElevationGainMeters(points: HikePoint[]): number {
  let totalElevationGain = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previousElevation = points[index - 1].elevationMeters;
    const currentElevation = points[index].elevationMeters;

    if (previousElevation === null || currentElevation === null) {
      continue;
    }

    const elevationDelta = currentElevation - previousElevation;

    if (elevationDelta > 0) {
      totalElevationGain += elevationDelta;
    }
  }

  return totalElevationGain;
}

export function calculateDurationSeconds(points: HikePoint[]): number | null {
  const firstTimestamp = points.find((point) => point.recordedAt)?.recordedAt;
  const lastTimestamp = [...points].reverse().find((point) => point.recordedAt)?.recordedAt;

  if (!firstTimestamp || !lastTimestamp) {
    return null;
  }

  const duration = (new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime()) / 1000;
  return duration > 0 ? duration : null;
}

export function getBounds(points: HikePoint[]): HikeBounds {
  const firstPoint = points[0];

  if (!firstPoint) {
    throw new Error('A hike needs at least one point.');
  }

  return points.reduce<HikeBounds>(
    (bounds, point) => ({
      minLatitude: Math.min(bounds.minLatitude, point.latitude),
      maxLatitude: Math.max(bounds.maxLatitude, point.latitude),
      minLongitude: Math.min(bounds.minLongitude, point.longitude),
      maxLongitude: Math.max(bounds.maxLongitude, point.longitude),
    }),
    {
      minLatitude: firstPoint.latitude,
      maxLatitude: firstPoint.latitude,
      minLongitude: firstPoint.longitude,
      maxLongitude: firstPoint.longitude,
    }
  );
}

export function getMapRegion(bounds: HikeBounds): Region {
  const latitudeDelta = Math.max((bounds.maxLatitude - bounds.minLatitude) * 1.35, 0.01);
  const longitudeDelta = Math.max((bounds.maxLongitude - bounds.minLongitude) * 1.35, 0.01);

  return {
    latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
    longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

export function getBoundsFromRegion(region: Region): HikeBounds {
  const halfLatitudeDelta = region.latitudeDelta / 2;
  const halfLongitudeDelta = region.longitudeDelta / 2;

  return {
    minLatitude: region.latitude - halfLatitudeDelta,
    maxLatitude: region.latitude + halfLatitudeDelta,
    minLongitude: region.longitude - halfLongitudeDelta,
    maxLongitude: region.longitude + halfLongitudeDelta,
  };
}

export function getCombinedBounds(hikes: Pick<HikeRecord, 'bounds'>[]): HikeBounds {
  const firstHike = hikes[0];

  if (!firstHike) {
    throw new Error('At least one hike is required.');
  }

  return hikes.slice(1).reduce<HikeBounds>(
    (bounds, hike) => ({
      minLatitude: Math.min(bounds.minLatitude, hike.bounds.minLatitude),
      maxLatitude: Math.max(bounds.maxLatitude, hike.bounds.maxLatitude),
      minLongitude: Math.min(bounds.minLongitude, hike.bounds.minLongitude),
      maxLongitude: Math.max(bounds.maxLongitude, hike.bounds.maxLongitude),
    }),
    { ...firstHike.bounds }
  );
}

export function doBoundsIntersect(left: HikeBounds, right: HikeBounds): boolean {
  return !(
    left.maxLatitude < right.minLatitude ||
    left.minLatitude > right.maxLatitude ||
    left.maxLongitude < right.minLongitude ||
    left.minLongitude > right.maxLongitude
  );
}

export function countHikesInBounds(
  hikes: Pick<HikeRecord, 'bounds'>[],
  visibleBounds: HikeBounds
): number {
  return hikes.reduce(
    (count, hike) => count + (doBoundsIntersect(hike.bounds, visibleBounds) ? 1 : 0),
    0
  );
}

function projectCoordinateToMeters(point: Pick<LatLng, 'latitude' | 'longitude'>, latitudeAnchor: number) {
  return {
    x: toRadians(point.longitude) * EARTH_RADIUS_METERS * Math.cos(toRadians(latitudeAnchor)),
    y: toRadians(point.latitude) * EARTH_RADIUS_METERS,
  };
}

function getDistancePointToSegmentMeters(
  target: Pick<LatLng, 'latitude' | 'longitude'>,
  start: Pick<LatLng, 'latitude' | 'longitude'>,
  finish: Pick<LatLng, 'latitude' | 'longitude'>
): number {
  const latitudeAnchor = (target.latitude + start.latitude + finish.latitude) / 3;
  const projectedTarget = projectCoordinateToMeters(target, latitudeAnchor);
  const projectedStart = projectCoordinateToMeters(start, latitudeAnchor);
  const projectedFinish = projectCoordinateToMeters(finish, latitudeAnchor);
  const deltaX = projectedFinish.x - projectedStart.x;
  const deltaY = projectedFinish.y - projectedStart.y;
  const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;

  if (segmentLengthSquared === 0) {
    return Math.hypot(projectedTarget.x - projectedStart.x, projectedTarget.y - projectedStart.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((projectedTarget.x - projectedStart.x) * deltaX +
        (projectedTarget.y - projectedStart.y) * deltaY) /
        segmentLengthSquared
    )
  );

  const nearestX = projectedStart.x + projection * deltaX;
  const nearestY = projectedStart.y + projection * deltaY;

  return Math.hypot(projectedTarget.x - nearestX, projectedTarget.y - nearestY);
}

export function getDistanceToRouteMeters(
  points: HikePoint[],
  target: Pick<LatLng, 'latitude' | 'longitude'>
): number {
  if (points.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (points.length === 1) {
    return calculatePointDistanceMeters(points[0], {
      latitude: target.latitude,
      longitude: target.longitude,
      elevationMeters: null,
      recordedAt: null,
    });
  }

  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = getDistancePointToSegmentMeters(target, points[index - 1], points[index]);

    if (segmentDistance < nearestDistance) {
      nearestDistance = segmentDistance;
    }
  }

  return nearestDistance;
}

export function getNearestHikeIdToCoordinate(
  hikes: Pick<HikeRecord, 'id' | 'points'>[],
  target: Pick<LatLng, 'latitude' | 'longitude'>,
  thresholdMeters = 220
): string | null {
  let nearestHikeId: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  hikes.forEach((hike) => {
    const distance = getDistanceToRouteMeters(hike.points, target);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestHikeId = hike.id;
    }
  });

  return nearestDistance <= thresholdMeters ? nearestHikeId : null;
}

export function getNearestElevationProfilePoint(
  profilePoints: ElevationProfilePoint[],
  target: Pick<LatLng, 'latitude' | 'longitude'>,
  thresholdMeters = 220
): ElevationProfilePoint | null {
  let nearestPoint: ElevationProfilePoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  profilePoints.forEach((point) => {
    const distance = calculatePointDistanceMeters(
      {
        latitude: point.latitude,
        longitude: point.longitude,
        elevationMeters: point.elevationMeters,
        recordedAt: null,
      },
      {
        latitude: target.latitude,
        longitude: target.longitude,
        elevationMeters: null,
        recordedAt: null,
      }
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPoint = point;
    }
  });

  return nearestDistance <= thresholdMeters ? nearestPoint : null;
}

export function buildRoutePreview(
  points: HikePoint[],
  width: number,
  height: number,
  padding: number
): RoutePreview | null {
  if (points.length < 2) {
    return null;
  }

  const bounds = getBounds(points);
  const latitudeSpan = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.0001);
  const longitudeSpan = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.0001);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const scale = Math.min(innerWidth / longitudeSpan, innerHeight / latitudeSpan);
  const renderedWidth = longitudeSpan * scale;
  const renderedHeight = latitudeSpan * scale;
  const offsetX = padding + (innerWidth - renderedWidth) / 2;
  const offsetY = padding + (innerHeight - renderedHeight) / 2;

  const projectPoint = (point: HikePoint) => ({
    x: offsetX + (point.longitude - bounds.minLongitude) * scale,
    y: offsetY + (bounds.maxLatitude - point.latitude) * scale,
  });

  const projectedPoints = points.map(projectPoint);
  const pathData = projectedPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  return {
    pathData,
    start: projectedPoints[0],
    finish: projectedPoints[projectedPoints.length - 1],
  };
}
