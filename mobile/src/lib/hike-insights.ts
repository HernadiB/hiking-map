import { calculatePointDistanceMeters } from './geo';
import { palette } from './theme';
import type {
  DifficultyLevel,
  ElevationProfilePoint,
  HikeInsights,
  HikePoint,
  HikeRecord,
  RouteDynamicsItem,
} from '../types/hikes';

function sampleElevationProfile(profile: ElevationProfilePoint[], maxPoints: number): ElevationProfilePoint[] {
  if (profile.length <= maxPoints) {
    return profile;
  }

  const stride = Math.ceil(profile.length / maxPoints);
  const sampled = profile.filter((_, index) => index % stride === 0);

  if (sampled[sampled.length - 1] !== profile[profile.length - 1]) {
    sampled.push(profile[profile.length - 1]);
  }

  return sampled;
}

function getDifficulty(distanceKilometers: number, elevationGainMeters: number, durationHours: number | null): DifficultyLevel {
  const timeFactor = durationHours ?? distanceKilometers / 4.5;
  const score = distanceKilometers * 0.85 + elevationGainMeters / 140 + timeFactor * 1.15;

  if (score < 12) {
    return 'Easy';
  }

  if (score < 21) {
    return 'Moderate';
  }

  return 'Hard';
}

function getRouteType(points: HikePoint[]): 'loop' | 'pointToPoint' {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  if (!startPoint || !endPoint) {
    return 'pointToPoint';
  }

  const endDistance = calculatePointDistanceMeters(startPoint, endPoint);
  return endDistance < 600 ? 'loop' : 'pointToPoint';
}

function getStartToFinishGapMeters(points: HikePoint[]): number | null {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  if (!startPoint || !endPoint) {
    return null;
  }

  return calculatePointDistanceMeters(startPoint, endPoint);
}

function getRecordedMonthIndex(recordedAt: string | null): number | null {
  if (!recordedAt) {
    return null;
  }

  return new Date(recordedAt).getMonth();
}

export function getHikeInsights(hike: HikeRecord): HikeInsights {
  const profile: ElevationProfilePoint[] = [];
  const routeDynamicsBase: Record<RouteDynamicsItem['key'], number> = {
    flat: 0,
    rolling: 0,
    climb: 0,
    descent: 0,
  };
  const totalDistanceKilometers = hike.distanceMeters / 1000;
  const durationHours = hike.durationSeconds === null ? null : hike.durationSeconds / 3600;
  let accumulatedDistance = 0;
  let elevationLossMeters = 0;
  let lowestElevationMeters: number | null = null;
  let highestElevationMeters: number | null = null;
  let totalAbsGrade = 0;
  let gradeDistance = 0;
  let steepestClimbPercent: number | null = null;
  let steepestDescentPercent: number | null = null;

  const firstElevationPoint =
    hike.points.find((point) => point.elevationMeters !== null) ?? null;
  const firstElevation = firstElevationPoint?.elevationMeters ?? null;
  const startToFinishGapMeters = getStartToFinishGapMeters(hike.points);

  if (firstElevation !== null) {
    lowestElevationMeters = firstElevation;
    highestElevationMeters = firstElevation;
    profile.push({
      distanceMeters: 0,
      elevationMeters: firstElevation,
      latitude: firstElevationPoint!.latitude,
      longitude: firstElevationPoint!.longitude,
      sourcePointIndex: hike.points.findIndex((point) => point === firstElevationPoint),
      surfaceType: firstElevationPoint!.surfaceType ?? null,
    });
  }

  for (let index = 1; index < hike.points.length; index += 1) {
    const previous = hike.points[index - 1];
    const current = hike.points[index];
    const segmentDistance = calculatePointDistanceMeters(previous, current);
    const previousElevation = previous.elevationMeters;
    const currentElevation = current.elevationMeters;

    accumulatedDistance += segmentDistance;

    if (previousElevation !== null && currentElevation !== null) {
      const elevationDelta = currentElevation - previousElevation;
      const grade = segmentDistance > 0 ? elevationDelta / segmentDistance : 0;
      const gradePercent = grade * 100;

      totalAbsGrade += Math.abs(grade) * segmentDistance;
      gradeDistance += segmentDistance;

      if (gradePercent > 0 && (steepestClimbPercent === null || gradePercent > steepestClimbPercent)) {
        steepestClimbPercent = gradePercent;
      }

      if (gradePercent < 0 && (steepestDescentPercent === null || gradePercent < steepestDescentPercent)) {
        steepestDescentPercent = gradePercent;
      }

      if (elevationDelta < 0) {
        elevationLossMeters += Math.abs(elevationDelta);
      }

      if (lowestElevationMeters === null || currentElevation < lowestElevationMeters) {
        lowestElevationMeters = currentElevation;
      }

      if (highestElevationMeters === null || currentElevation > highestElevationMeters) {
        highestElevationMeters = currentElevation;
      }

      if (Math.abs(grade) <= 0.02) {
        routeDynamicsBase.flat += segmentDistance;
      } else if (grade > 0.06) {
        routeDynamicsBase.climb += segmentDistance;
      } else if (grade < -0.06) {
        routeDynamicsBase.descent += segmentDistance;
      } else {
        routeDynamicsBase.rolling += segmentDistance;
      }

      profile.push({
        distanceMeters: accumulatedDistance,
        elevationMeters: currentElevation,
        latitude: current.latitude,
        longitude: current.longitude,
        sourcePointIndex: index,
        surfaceType: current.surfaceType ?? previous.surfaceType ?? null,
      });
    }
  }

  const routeDynamics: RouteDynamicsItem[] = [
    {
      key: 'flat' as const,
      label: 'Flat',
      color: palette.chartFlat,
      distanceMeters: routeDynamicsBase.flat,
      percentage: hike.distanceMeters === 0 ? 0 : routeDynamicsBase.flat / hike.distanceMeters,
    },
    {
      key: 'rolling' as const,
      label: 'Rolling',
      color: palette.chartRolling,
      distanceMeters: routeDynamicsBase.rolling,
      percentage: hike.distanceMeters === 0 ? 0 : routeDynamicsBase.rolling / hike.distanceMeters,
    },
    {
      key: 'climb' as const,
      label: 'Climb',
      color: palette.chartClimb,
      distanceMeters: routeDynamicsBase.climb,
      percentage: hike.distanceMeters === 0 ? 0 : routeDynamicsBase.climb / hike.distanceMeters,
    },
    {
      key: 'descent' as const,
      label: 'Descent',
      color: palette.chartDescent,
      distanceMeters: routeDynamicsBase.descent,
      percentage: hike.distanceMeters === 0 ? 0 : routeDynamicsBase.descent / hike.distanceMeters,
    },
  ].filter((item) => item.distanceMeters > 0);

  const estimatedPaceSecondsPerKilometer =
    hike.durationSeconds === null || totalDistanceKilometers === 0
      ? null
      : hike.durationSeconds / totalDistanceKilometers;
  const dominantRouteDynamics = routeDynamics.reduce<RouteDynamicsItem | null>((currentBest, item) => {
    if (!currentBest || item.distanceMeters > currentBest.distanceMeters) {
      return item;
    }

    return currentBest;
  }, null);
  const elevationRangeMeters =
    lowestElevationMeters === null || highestElevationMeters === null
      ? null
      : highestElevationMeters - lowestElevationMeters;
  const climbPerKilometerMeters =
    totalDistanceKilometers === 0 ? null : hike.elevationGainMeters / totalDistanceKilometers;
  const descentPerKilometerMeters =
    totalDistanceKilometers === 0 ? null : elevationLossMeters / totalDistanceKilometers;

  return {
    difficulty: getDifficulty(totalDistanceKilometers, hike.elevationGainMeters, durationHours),
    routeType: getRouteType(hike.points),
    elevationLossMeters,
    lowestElevationMeters,
    highestElevationMeters,
    elevationRangeMeters,
    startToFinishGapMeters,
    climbPerKilometerMeters,
    descentPerKilometerMeters,
    steepestClimbPercent,
    steepestDescentPercent,
    estimatedPaceSecondsPerKilometer,
    totalDistanceKilometers,
    durationHours,
    routeDynamics,
    dominantRouteDynamicsKey: dominantRouteDynamics?.key ?? null,
    elevationProfile: sampleElevationProfile(profile, 120),
    recordedMonthIndex: getRecordedMonthIndex(hike.startedAt),
    averageGradePercent: gradeDistance === 0 ? null : (totalAbsGrade / gradeDistance) * 100,
  };
}
