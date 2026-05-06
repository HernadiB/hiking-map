import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { formatDistance, formatElevation } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import type { ElevationProfilePoint } from '../types/hikes';

function buildLinePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function readInteractionLocationX(
  event:
    | {
        currentTarget?: { getBoundingClientRect?: (() => { left: number }) | undefined } | null;
        nativeEvent?: {
          clientX?: number;
          locationX?: number;
          offsetX?: number;
        };
      }
    | undefined
): number | null {
  const nativeEvent = event?.nativeEvent;

  if (typeof nativeEvent?.locationX === 'number') {
    return nativeEvent.locationX;
  }

  if (typeof nativeEvent?.offsetX === 'number') {
    return nativeEvent.offsetX;
  }

  const currentTarget = event?.currentTarget;

  if (
    currentTarget &&
    typeof currentTarget.getBoundingClientRect === 'function' &&
    typeof nativeEvent?.clientX === 'number'
  ) {
    return nativeEvent.clientX - currentTarget.getBoundingClientRect().left;
  }

  return null;
}

export function ElevationProfileChart({
  points,
  activePoint = null,
  onActivePointChange,
  height = 280,
}: {
  points: ElevationProfilePoint[];
  activePoint?: ElevationProfilePoint | null;
  onActivePointChange?: ((point: ElevationProfilePoint | null) => void) | undefined;
  height?: number;
}) {
  const { t } = useI18n();
  const [renderedWidth, setRenderedWidth] = useState(920);
  const width = 920;
  const paddingX = 32;
  const paddingY = 28;

  const chartData = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const minElevation = Math.min(...points.map((point) => point.elevationMeters));
    const maxElevation = Math.max(...points.map((point) => point.elevationMeters));
    const totalDistance = points[points.length - 1]?.distanceMeters ?? 0;
    const elevationRange = Math.max(maxElevation - minElevation, 1);
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const projectedPoints = points.map((point) => ({
      ...point,
      x: paddingX + (point.distanceMeters / Math.max(totalDistance, 1)) * chartWidth,
      y: paddingY + (1 - (point.elevationMeters - minElevation) / elevationRange) * chartHeight,
    }));

    const linePath = buildLinePath(projectedPoints);
    const areaPath = `${linePath} L ${paddingX + chartWidth} ${height - paddingY} L ${paddingX} ${
      height - paddingY
    } Z`;

    return {
      minElevation,
      maxElevation,
      totalDistance,
      projectedPoints,
      linePath,
      areaPath,
    };
  }, [points]);

  if (!chartData) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{t('chartElevationUnavailable')}</Text>
      </View>
    );
  }

  const activeProjectedPoint =
    activePoint === null
      ? null
      : chartData.projectedPoints.find(
          (point) => point.sourcePointIndex === activePoint.sourcePointIndex
        ) ?? null;

  const updateActivePointFromLocation = (locationX: number) => {
    if (!onActivePointChange || renderedWidth <= 0) {
      return;
    }

    const internalX = (locationX / renderedWidth) * width;
    const nearestPoint = chartData.projectedPoints.reduce((currentNearest, point) => {
      if (!currentNearest) {
        return point;
      }

      return Math.abs(point.x - internalX) < Math.abs(currentNearest.x - internalX)
        ? point
        : currentNearest;
    }, chartData.projectedPoints[0]);

    onActivePointChange(nearestPoint);
  };

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={(event) => {
          setRenderedWidth(event.nativeEvent.layout.width || width);
        }}
        onPointerLeave={() => onActivePointChange?.(null)}
        onPointerMove={(event) => {
          const locationX = readInteractionLocationX(
            event as {
              currentTarget?: { getBoundingClientRect?: (() => { left: number }) | undefined } | null;
              nativeEvent?: {
                clientX?: number;
                locationX?: number;
                offsetX?: number;
              };
            }
          );

          if (locationX !== null) {
            updateActivePointFromLocation(locationX);
          }
        }}
        onTouchStart={(event) => {
          updateActivePointFromLocation(event.nativeEvent.locationX);
        }}
        onTouchMove={(event) => {
          updateActivePointFromLocation(event.nativeEvent.locationX);
        }}
        onTouchCancel={() => onActivePointChange?.(null)}
        onTouchEnd={() => onActivePointChange?.(null)}
        style={styles.chartFrame}
      >
        <Svg height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
          <Defs>
            <LinearGradient id="elevation-fill" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="rgba(47,107,70,0.34)" />
              <Stop offset="1" stopColor="rgba(47,107,70,0.03)" />
            </LinearGradient>
          </Defs>

          <Rect fill="#EEF4E7" height={height} rx="24" ry="24" width={width} />

          <Path d={chartData.areaPath} fill="url(#elevation-fill)" />
          <Path
            d={chartData.linePath}
            fill="none"
            stroke={palette.accentStrong}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6"
          />

          {activeProjectedPoint ? (
            <>
              <Line
                stroke="rgba(32,49,38,0.22)"
                strokeDasharray="8 8"
                strokeWidth="3"
                x1={activeProjectedPoint.x}
                x2={activeProjectedPoint.x}
                y1={paddingY}
                y2={height - paddingY}
              />
              <Circle
                cx={activeProjectedPoint.x}
                cy={activeProjectedPoint.y}
                fill="#F4FAF1"
                r="10"
                stroke={palette.accentStrong}
                strokeWidth="5"
              />
            </>
          ) : null}
        </Svg>
      </View>

      <View style={styles.labelsRow}>
        <View>
          <Text style={styles.caption}>{t('chartLowestPoint')}</Text>
          <Text style={styles.value}>{formatElevation(chartData.minElevation)}</Text>
        </View>
        <View>
          <Text style={styles.caption}>{t('chartHighestPoint')}</Text>
          <Text style={styles.value}>{formatElevation(chartData.maxElevation)}</Text>
        </View>
        <View>
          <Text style={styles.caption}>{t('chartDistanceSpan')}</Text>
          <Text style={styles.value}>{formatDistance(chartData.totalDistance)}</Text>
        </View>
      </View>

      <View style={styles.focusCard}>
        {activeProjectedPoint ? (
          <>
            <View style={styles.focusMetric}>
              <Text style={styles.caption}>{t('chartFocusedDistance')}</Text>
              <Text style={styles.focusValue}>
                {formatDistance(activeProjectedPoint.distanceMeters)}
              </Text>
            </View>
            <View style={styles.focusMetric}>
              <Text style={styles.caption}>{t('chartFocusedElevation')}</Text>
              <Text style={styles.focusValue}>
                {formatElevation(activeProjectedPoint.elevationMeters)}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.focusHint}>{t('chartInteractiveHint')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  chartFrame: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#EEF4E7',
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  caption: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  focusCard: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderRadius: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  focusMetric: {
    flexGrow: 1,
    minWidth: '46%',
  },
  focusValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 4,
  },
  focusHint: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
