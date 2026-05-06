export type HikeSourceType = 'file' | 'url';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Hard';
export type AppLanguage = 'en' | 'hu';
export type HikeRouteType = 'loop' | 'pointToPoint';

export type HikePoint = {
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  recordedAt: string | null;
};

export type HikeBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export type HikeDraft = {
  title: string;
  sourceType: HikeSourceType;
  sourceValue: string;
  distanceMeters: number;
  elevationGainMeters: number;
  durationSeconds: number | null;
  startedAt: string | null;
  bounds: HikeBounds;
  points: HikePoint[];
};

export type HikeRecord = HikeDraft & {
  id: string;
  createdAt: string;
};

export type HikeSummary = Omit<HikeRecord, 'points'> & {
  pointCount: number;
};

export type RouteMapProps = {
  hikes: HikeRecord[];
  height?: number;
  selectedHikeId?: string | null;
  showMarkers?: boolean;
  showRoutePreview?: boolean;
  showVisibleCount?: boolean;
  focusedProfilePoint?: ElevationProfilePoint | null;
  profilePoints?: ElevationProfilePoint[];
  onSelectHike?: ((hikeId: string) => void) | undefined;
  onVisibleHikeCountChange?: ((count: number) => void) | undefined;
  onFocusedProfilePointChange?: ((point: ElevationProfilePoint | null) => void) | undefined;
};

export type RoutePreview = {
  pathData: string;
  start: { x: number; y: number };
  finish: { x: number; y: number };
};

export type ElevationProfilePoint = {
  distanceMeters: number;
  elevationMeters: number;
  latitude: number;
  longitude: number;
  sourcePointIndex: number;
};

export type RouteDynamicsItem = {
  key: 'flat' | 'rolling' | 'climb' | 'descent';
  label: string;
  color: string;
  distanceMeters: number;
  percentage: number;
};

export type HikeInsights = {
  difficulty: DifficultyLevel;
  routeType: HikeRouteType;
  elevationLossMeters: number;
  lowestElevationMeters: number | null;
  highestElevationMeters: number | null;
  elevationRangeMeters: number | null;
  startToFinishGapMeters: number | null;
  climbPerKilometerMeters: number | null;
  descentPerKilometerMeters: number | null;
  steepestClimbPercent: number | null;
  steepestDescentPercent: number | null;
  estimatedPaceSecondsPerKilometer: number | null;
  totalDistanceKilometers: number;
  durationHours: number | null;
  routeDynamics: RouteDynamicsItem[];
  dominantRouteDynamicsKey: RouteDynamicsItem['key'] | null;
  elevationProfile: ElevationProfilePoint[];
  recordedMonthIndex: number | null;
  averageGradePercent: number | null;
};

export type PublicHikeFeed = {
  version: 1;
  updatedAt: string;
  hikes: HikeRecord[];
};
