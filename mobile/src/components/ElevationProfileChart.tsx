import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { formatDistance, formatElevation } from '../lib/format';
import { getRouteDynamicsLabel, useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import type { ElevationProfilePoint, RouteDynamicsItem, RouteSurfaceType } from '../types/hikes';

function buildLinePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function getRouteDynamicsColor(grade: number): string {
  if (Math.abs(grade) <= 0.02) {
    return palette.chartFlat;
  }

  if (grade > 0.06) {
    return palette.chartClimb;
  }

  if (grade < -0.06) {
    return palette.chartDescent;
  }

  return palette.chartRolling;
}

function getSurfaceColor(surfaceType: RouteSurfaceType): string {
  if (surfaceType === 'asphalt') {
    return '#626B73';
  }

  if (surfaceType === 'paved') {
    return '#8C8172';
  }

  if (surfaceType === 'gravel') {
    return '#B49A6E';
  }

  if (surfaceType === 'dirt') {
    return '#8B5E34';
  }

  if (surfaceType === 'track') {
    return '#A97843';
  }

  if (surfaceType === 'path') {
    return '#6F8F4E';
  }

  if (surfaceType === 'grass') {
    return '#7FA35C';
  }

  if (surfaceType === 'rock') {
    return '#7B7D74';
  }

  return '#A8B1A2';
}

function getSurfaceLabel(surfaceType: RouteSurfaceType, language: 'en' | 'hu'): string {
  const labels = {
    en: {
      asphalt: 'Asphalt',
      paved: 'Paved',
      gravel: 'Gravel',
      dirt: 'Dirt road',
      track: 'Track road',
      path: 'Path',
      grass: 'Grass',
      rock: 'Rocky',
      unknown: 'Unknown',
    },
    hu: {
      asphalt: 'Aszfalt',
      paved: 'Burkolt',
      gravel: 'Murva',
      dirt: 'Földút',
      track: 'Dózerút',
      path: 'Ösvény',
      grass: 'Füves',
      rock: 'Köves',
      unknown: 'Ismeretlen',
    },
  } as const;

  return labels[language][surfaceType];
}

function readInteractionLocation(
  event:
    | {
        currentTarget?:
          | { getBoundingClientRect?: (() => { left: number; top: number }) | undefined }
          | null;
        nativeEvent?: {
          clientX?: number;
          clientY?: number;
          locationX?: number;
          locationY?: number;
          offsetX?: number;
          offsetY?: number;
        };
      }
    | undefined
): { x: number; y: number } | null {
  const nativeEvent = event?.nativeEvent;

  if (
    typeof nativeEvent?.locationX === 'number' &&
    typeof nativeEvent.locationY === 'number'
  ) {
    return {
      x: nativeEvent.locationX,
      y: nativeEvent.locationY,
    };
  }

  if (typeof nativeEvent?.offsetX === 'number' && typeof nativeEvent.offsetY === 'number') {
    return {
      x: nativeEvent.offsetX,
      y: nativeEvent.offsetY,
    };
  }

  const currentTarget = event?.currentTarget;

  if (
    currentTarget &&
    typeof currentTarget.getBoundingClientRect === 'function' &&
    typeof nativeEvent?.clientX === 'number' &&
    typeof nativeEvent.clientY === 'number'
  ) {
    const bounds = currentTarget.getBoundingClientRect();
    return {
      x: nativeEvent.clientX - bounds.left,
      y: nativeEvent.clientY - bounds.top,
    };
  }

  return null;
}

export function ElevationProfileChart({
  points,
  activePoint = null,
  onActivePointChange,
  height = 280,
  routeDynamicsItems = [],
}: {
  points: ElevationProfilePoint[];
  activePoint?: ElevationProfilePoint | null;
  onActivePointChange?: ((point: ElevationProfilePoint | null) => void) | undefined;
  height?: number;
  routeDynamicsItems?: RouteDynamicsItem[];
}) {
  const { language, t } = useI18n();
  const [renderedWidth, setRenderedWidth] = useState(920);
  const [isInteracting, setIsInteracting] = useState(false);
  const width = 920;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 34;
  const paddingBottom = 44;

  const chartData = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const minElevation = Math.min(...points.map((point) => point.elevationMeters));
    const maxElevation = Math.max(...points.map((point) => point.elevationMeters));
    const totalDistance = points[points.length - 1]?.distanceMeters ?? 0;
    const elevationRange = Math.max(maxElevation - minElevation, 1);
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const projectedPoints = points.map((point) => ({
      ...point,
      x: paddingLeft + (point.distanceMeters / Math.max(totalDistance, 1)) * chartWidth,
      y: paddingTop + (1 - (point.elevationMeters - minElevation) / elevationRange) * chartHeight,
    }));

    const linePath = buildLinePath(projectedPoints);
    const areaPath = `${linePath} L ${paddingLeft + chartWidth} ${height - paddingBottom} L ${paddingLeft} ${
      height - paddingBottom
    } Z`;
    const segmentPaths = projectedPoints.slice(1).map((point, index) => {
      const previousPoint = projectedPoints[index];
      const distanceDelta = point.distanceMeters - previousPoint.distanceMeters;
      const elevationDelta = point.elevationMeters - previousPoint.elevationMeters;
      const grade = distanceDelta > 0 ? elevationDelta / distanceDelta : 0;

      return {
        color: getRouteDynamicsColor(grade),
        d: `M ${previousPoint.x} ${previousPoint.y} L ${point.x} ${point.y}`,
        key: `${previousPoint.sourcePointIndex}-${point.sourcePointIndex}`,
      };
    });
    const surfaceSegments = projectedPoints.slice(1).flatMap((point, index) => {
      const previousPoint = projectedPoints[index];
      const surfaceType = point.surfaceType ?? previousPoint.surfaceType ?? null;

      if (!surfaceType) {
        return [];
      }

      return [
        {
          color: getSurfaceColor(surfaceType),
          key: `${previousPoint.sourcePointIndex}-${point.sourcePointIndex}-${surfaceType}`,
          surfaceType,
          x1: previousPoint.x,
          x2: point.x,
        },
      ];
    });
    const surfaceLegendItems = Array.from(
      new Map(
        surfaceSegments.map((segment) => [
          segment.surfaceType,
          {
            color: segment.color,
            surfaceType: segment.surfaceType,
          },
        ])
      ).values()
    );
    const gridLines = Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      const elevation = maxElevation - ratio * elevationRange;

      return {
        elevation,
        y: paddingTop + ratio * chartHeight,
      };
    });
    const distanceTicks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;

      return {
        distance: totalDistance * ratio,
        x: paddingLeft + ratio * chartWidth,
      };
    });

    return {
      minElevation,
      maxElevation,
      totalDistance,
      projectedPoints,
      distanceTicks,
      gridLines,
      segmentPaths,
      surfaceLegendItems,
      surfaceSegments,
      linePath,
      areaPath,
    };
  }, [height, points]);

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

  const updateActivePointFromLocation = (location: { x: number; y: number }) => {
    if (!onActivePointChange || renderedWidth <= 0) {
      return;
    }

    const internalX = (location.x / renderedWidth) * width;
    const internalY = (location.y / height) * height;
    const nearestPoint = chartData.projectedPoints.reduce((currentNearest, point) => {
      if (!currentNearest) {
        return point;
      }

      return Math.abs(point.x - internalX) < Math.abs(currentNearest.x - internalX)
        ? point
        : currentNearest;
    }, chartData.projectedPoints[0]);

    if (Math.abs(nearestPoint.y - internalY) > 26) {
      onActivePointChange(null);
      return;
    }

    onActivePointChange(nearestPoint);
  };

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={(event) => {
          setRenderedWidth(event.nativeEvent.layout.width || width);
        }}
        onPointerCancel={() => {
          setIsInteracting(false);
          onActivePointChange?.(null);
        }}
        onPointerDown={(event) => {
          setIsInteracting(true);
          const pointerEvent = event as {
            currentTarget?: {
              getBoundingClientRect?: (() => { left: number; top: number }) | undefined;
              setPointerCapture?: ((pointerId: number) => void) | undefined;
            } | null;
            nativeEvent?: {
              pointerId?: number;
              clientX?: number;
              clientY?: number;
              locationX?: number;
              locationY?: number;
              offsetX?: number;
              offsetY?: number;
            };
          };

          if (
            typeof pointerEvent.nativeEvent?.pointerId === 'number' &&
            typeof pointerEvent.currentTarget?.setPointerCapture === 'function'
          ) {
            pointerEvent.currentTarget.setPointerCapture(pointerEvent.nativeEvent.pointerId);
          }

          const location = readInteractionLocation(pointerEvent);

          if (location !== null) {
            updateActivePointFromLocation(location);
          }
        }}
        onPointerLeave={() => {
          if (!isInteracting) {
            onActivePointChange?.(null);
          }
        }}
        onPointerMove={(event) => {
          const location = readInteractionLocation(
            event as {
              currentTarget?:
                | { getBoundingClientRect?: (() => { left: number; top: number }) | undefined }
                | null;
              nativeEvent?: {
                clientX?: number;
                clientY?: number;
                locationX?: number;
                locationY?: number;
                offsetX?: number;
                offsetY?: number;
              };
            }
          );

          if (location !== null) {
            updateActivePointFromLocation(location);
          }
        }}
        onPointerUp={() => {
          setIsInteracting(false);
        }}
        onTouchStart={(event) => {
          setIsInteracting(true);
          updateActivePointFromLocation({
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          });
        }}
        onTouchMove={(event) => {
          updateActivePointFromLocation({
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          });
        }}
        onTouchCancel={() => {
          setIsInteracting(false);
          onActivePointChange?.(null);
        }}
        onTouchEnd={() => {
          setIsInteracting(false);
        }}
        style={styles.chartFrame}
      >
        <Svg height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
          <Defs>
            <LinearGradient id="elevation-fill" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="rgba(47,107,70,0.34)" />
              <Stop offset="1" stopColor="rgba(47,107,70,0.03)" />
            </LinearGradient>
          </Defs>

          <Rect fill="#FAFCF7" height={height} rx="24" ry="24" width={width} />

          {chartData.gridLines.map((line) => (
            <Line
              key={`grid-${Math.round(line.elevation)}-${Math.round(line.y)}`}
              stroke="rgba(72,91,74,0.22)"
              strokeDasharray="9 11"
              strokeWidth="2"
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={line.y}
              y2={line.y}
            />
          ))}

          {chartData.gridLines.map((line) => (
            <SvgText
              key={`grid-label-${Math.round(line.elevation)}-${Math.round(line.y)}`}
              fill="rgba(43,58,46,0.58)"
              fontSize="24"
              fontWeight="700"
              textAnchor="end"
              x={paddingLeft - 16}
              y={line.y + 8}
            >
              {formatElevation(line.elevation)}
            </SvgText>
          ))}

          {chartData.distanceTicks.map((tick) => (
            <SvgText
              key={`distance-${Math.round(tick.distance)}`}
              fill="rgba(43,58,46,0.48)"
              fontSize="22"
              fontWeight="700"
              textAnchor="middle"
              x={tick.x}
              y={height - 12}
            >
              {formatDistance(tick.distance)}
            </SvgText>
          ))}

          {chartData.surfaceSegments.map((segment) => (
            <Line
              key={segment.key}
              stroke={segment.color}
              strokeLinecap="round"
              strokeWidth="10"
              x1={segment.x1}
              x2={segment.x2}
              y1={height - 30}
              y2={height - 30}
            />
          ))}

          <Path d={chartData.areaPath} fill="url(#elevation-fill)" />
          <Path
            d={chartData.linePath}
            fill="none"
            stroke="rgba(255,255,255,0.96)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="12"
          />
          {chartData.segmentPaths.map((segment) => (
            <Path
              key={segment.key}
              d={segment.d}
              fill="none"
              stroke={segment.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
          ))}

          {activeProjectedPoint ? (
            <>
              <Line
                stroke="rgba(32,49,38,0.22)"
                strokeDasharray="8 8"
                strokeWidth="3"
                x1={activeProjectedPoint.x}
                x2={activeProjectedPoint.x}
                y1={paddingTop}
                y2={height - paddingBottom}
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

      <View style={styles.profileLegendPanel}>
        <View style={styles.legendGroup}>
          <Text style={styles.legendTitle}>
            {language === 'hu' ? 'Útvonaldinamika' : 'Route dynamics'}
          </Text>
          <View style={styles.legendChips}>
            {routeDynamicsItems.map((item) => (
              <View key={item.key} style={styles.legendChip}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{getRouteDynamicsLabel(item.key, t)}</Text>
                <Text style={styles.legendMutedText}>{Math.round(item.percentage * 100)}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.legendGroup}>
          <Text style={styles.legendTitle}>
            {language === 'hu' ? 'Úttípus a GPX alapján' : 'Surface from GPX'}
          </Text>
          {chartData.surfaceLegendItems.length > 0 ? (
            <View style={styles.legendChips}>
              {chartData.surfaceLegendItems.map((item) => (
                <View key={item.surfaceType} style={styles.legendChip}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>
                    {getSurfaceLabel(item.surfaceType, language)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.legendMutedText}>
              {language === 'hu'
                ? 'A GPX nem tartalmaz úttípus/surface adatot.'
                : 'The GPX does not include surface data.'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  chartFrame: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: palette.panelRaised,
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
    minWidth: 140,
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
  profileLegendPanel: {
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  legendGroup: {
    gap: 10,
  },
  legendTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  legendChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendChip: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legendSwatch: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  legendMutedText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
