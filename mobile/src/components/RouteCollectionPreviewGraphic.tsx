import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { getCombinedBounds } from '../lib/geo';
import { palette } from '../lib/theme';
import type { ElevationProfilePoint, HikePoint, HikeRecord } from '../types/hikes';

function projectPoint(
  point: Pick<HikePoint, 'latitude' | 'longitude'>,
  bounds: ReturnType<typeof getCombinedBounds>,
  width: number,
  height: number,
  padding: number
) {
  const latitudeSpan = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.0001);
  const longitudeSpan = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.0001);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const scale = Math.min(innerWidth / longitudeSpan, innerHeight / latitudeSpan);
  const renderedWidth = longitudeSpan * scale;
  const renderedHeight = latitudeSpan * scale;
  const offsetX = padding + (innerWidth - renderedWidth) / 2;
  const offsetY = padding + (innerHeight - renderedHeight) / 2;

  return {
    x: offsetX + (point.longitude - bounds.minLongitude) * scale,
    y: offsetY + (bounds.maxLatitude - point.latitude) * scale,
  };
}

function buildPathData(
  points: HikePoint[],
  bounds: ReturnType<typeof getCombinedBounds>,
  width: number,
  height: number,
  padding: number
) {
  if (points.length < 2) {
    return null;
  }

  const projectedPoints = points.map((point) => projectPoint(point, bounds, width, height, padding));

  return {
    pathData: projectedPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' '),
    start: projectedPoints[0],
    finish: projectedPoints[projectedPoints.length - 1],
  };
}

export function RouteCollectionPreviewGraphic({
  hikes,
  selectedHikeId = null,
  focusedProfilePoint = null,
  height = 220,
}: {
  hikes: HikeRecord[];
  selectedHikeId?: string | null;
  focusedProfilePoint?: ElevationProfilePoint | null;
  height?: number;
}) {
  if (hikes.length === 0) {
    return null;
  }

  const viewBoxWidth = 1000;
  const viewBoxHeight = 620;
  const padding = 64;
  const bounds = getCombinedBounds(hikes);
  const selectedHike = hikes.find((hike) => hike.id === selectedHikeId) ?? hikes[0];
  const guideLines = [140, 260, 380, 500];
  const projectedFocusedPoint = focusedProfilePoint
    ? projectPoint(focusedProfilePoint, bounds, viewBoxWidth, viewBoxHeight, padding)
    : null;

  return (
    <Svg height={height} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} width="100%">
      <Defs>
        <LinearGradient id="route-collection-background" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#EEF4EC" />
          <Stop offset="1" stopColor="#DDE8E1" />
        </LinearGradient>
      </Defs>

      <Rect
        fill="url(#route-collection-background)"
        height={viewBoxHeight}
        rx={38}
        ry={38}
        width={viewBoxWidth}
      />

      {guideLines.map((position) => (
        <Line
          key={`horizontal-${position}`}
          stroke="rgba(31,43,34,0.08)"
          strokeWidth="2"
          x1="54"
          x2={viewBoxWidth - 54}
          y1={position}
          y2={position}
        />
      ))}

      {guideLines.map((position) => (
        <Line
          key={`vertical-${position}`}
          stroke="rgba(31,43,34,0.08)"
          strokeWidth="2"
          x1={position + 90}
          x2={position + 90}
          y1="54"
          y2={viewBoxHeight - 54}
        />
      ))}

      {hikes.map((hike) => {
        const projection = buildPathData(hike.points, bounds, viewBoxWidth, viewBoxHeight, padding);

        if (!projection) {
          return null;
        }

        const isSelected = hike.id === selectedHike.id;

        return (
          <Path
            key={`${hike.id}-shadow`}
            d={projection.pathData}
            fill="none"
            opacity={isSelected ? 0.18 : 0.08}
            stroke="#121A15"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isSelected ? 18 : 12}
          />
        );
      })}

      {hikes.map((hike) => {
        const projection = buildPathData(hike.points, bounds, viewBoxWidth, viewBoxHeight, padding);

        if (!projection) {
          return null;
        }

        const isSelected = hike.id === selectedHike.id;

        return (
          <Path
            key={`${hike.id}-line`}
            d={projection.pathData}
            fill="none"
            opacity={isSelected ? 1 : 0.78}
            stroke={isSelected ? palette.sand : palette.accentStrong}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isSelected ? 8 : 5}
          />
        );
      })}

      {selectedHike.points.length > 1 ? (
        <>
          {(() => {
            const projection = buildPathData(
              selectedHike.points,
              bounds,
              viewBoxWidth,
              viewBoxHeight,
              padding
            );

            if (!projection) {
              return null;
            }

            return (
              <>
                <Circle cx={projection.start.x} cy={projection.start.y} fill="#3A7A63" r="15" />
                <Circle cx={projection.start.x} cy={projection.start.y} fill="#F6FBF8" r="7" />
                <Circle cx={projection.finish.x} cy={projection.finish.y} fill={palette.sand} r="15" />
                <Circle cx={projection.finish.x} cy={projection.finish.y} fill="#FFF8EE" r="7" />
              </>
            );
          })()}
        </>
      ) : null}

      {projectedFocusedPoint ? (
        <>
          <Circle
            cx={projectedFocusedPoint.x}
            cy={projectedFocusedPoint.y}
            fill="rgba(244,250,241,0.96)"
            r="14"
            stroke={palette.accentStrong}
            strokeWidth="4"
          />
          <Circle cx={projectedFocusedPoint.x} cy={projectedFocusedPoint.y} fill={palette.accentStrong} r="5" />
        </>
      ) : null}
    </Svg>
  );
}
