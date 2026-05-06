import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { buildRoutePreview } from '../lib/geo';
import { palette } from '../lib/theme';
import type { HikePoint } from '../types/hikes';

export function RoutePreviewGraphic({
  points,
  height = 220,
  showGrid = true,
}: {
  points: HikePoint[];
  height?: number;
  showGrid?: boolean;
}) {
  const viewBoxWidth = 1000;
  const viewBoxHeight = 620;
  const projection = buildRoutePreview(points, viewBoxWidth, viewBoxHeight, 64);
  const guideLines = [140, 260, 380, 500];

  if (!projection) {
    return null;
  }

  return (
    <Svg height={height} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} width="100%">
      <Defs>
        <LinearGradient id="route-preview-background" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#EEF4EC" />
          <Stop offset="1" stopColor="#DDE8E1" />
        </LinearGradient>
      </Defs>

      <Rect
        fill="url(#route-preview-background)"
        height={viewBoxHeight}
        rx={38}
        ry={38}
        width={viewBoxWidth}
      />

      {showGrid
        ? guideLines.map((position) => (
            <Line
              key={`horizontal-${position}`}
              stroke="rgba(31,43,34,0.08)"
              strokeWidth="2"
              x1="54"
              x2={viewBoxWidth - 54}
              y1={position}
              y2={position}
            />
          ))
        : null}

      {showGrid
        ? guideLines.map((position) => (
            <Line
              key={`vertical-${position}`}
              stroke="rgba(31,43,34,0.08)"
              strokeWidth="2"
              x1={position + 90}
              x2={position + 90}
              y1="54"
              y2={viewBoxHeight - 54}
            />
          ))
        : null}

      <Path
        d={projection.pathData}
        fill="none"
        opacity={0.16}
        stroke="#121A15"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="24"
      />
      <Path
        d={projection.pathData}
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <Path
        d={projection.pathData}
        fill="none"
        stroke={palette.accentStrong}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />

      <Circle cx={projection.start.x} cy={projection.start.y} fill="#3A7A63" r="15" />
      <Circle cx={projection.start.x} cy={projection.start.y} fill="#F6FBF8" r="7" />
      <Circle cx={projection.finish.x} cy={projection.finish.y} fill={palette.sand} r="15" />
      <Circle cx={projection.finish.x} cy={projection.finish.y} fill="#FFF8EE" r="7" />
    </Svg>
  );
}
