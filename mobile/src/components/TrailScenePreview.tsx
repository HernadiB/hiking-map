import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { getRouteTypeLabel, useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import type { DifficultyLevel, ElevationProfilePoint, HikeRouteType } from '../types/hikes';

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function TrailScenePreview({
  elevationProfile,
  routeType,
}: {
  ascentMeters: number;
  difficulty: DifficultyLevel;
  distanceMeters: number;
  durationSeconds: number | null;
  elevationProfile: ElevationProfilePoint[];
  routeType: HikeRouteType;
}) {
  const { language, t } = useI18n();
  const scene = useMemo(() => {
    if (elevationProfile.length < 2) {
      return null;
    }

    const width = 920;
    const height = 300;
    const paddingX = 56;
    const paddingY = 42;
    const minElevation = Math.min(...elevationProfile.map((point) => point.elevationMeters));
    const maxElevation = Math.max(...elevationProfile.map((point) => point.elevationMeters));
    const elevationRange = Math.max(maxElevation - minElevation, 1);
    const maxDistance = elevationProfile[elevationProfile.length - 1]?.distanceMeters ?? 1;
    const projected = elevationProfile.map((point) => {
      const x = paddingX + (point.distanceMeters / Math.max(maxDistance, 1)) * (width - paddingX * 2);
      const elevationRatio = (point.elevationMeters - minElevation) / elevationRange;
      const y = height - paddingY - elevationRatio * (height - paddingY * 2);

      return {
        x,
        y,
      };
    });
    const ridgePath = buildPath(projected);
    const terrainPath = `${ridgePath} L ${width - paddingX} ${height - 34} L ${paddingX} ${
      height - 34
    } Z`;

    return {
      height,
      maxElevation,
      minElevation,
      projected,
      ridgePath,
      terrainPath,
      width,
    };
  }, [elevationProfile]);

  const title = language === 'hu' ? '3D terepáttekintés' : '3D terrain overview';
  const description =
    language === 'hu'
      ? 'A GPX nyomvonalból készült izometrikus terepnézet, az Esri túraappok részletező nézetéhez hasonlóan.'
      : 'An isometric terrain view generated from the GPX route, inspired by Esri-style trail detail screens.';

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.eyebrow}>{language === 'hu' ? 'Terepnézet' : 'Terrain view'}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{getRouteTypeLabel(routeType, t)}</Text>
        </View>
      </View>

      <View style={styles.sceneCard}>
        {scene ? (
          <Svg height={scene.height} viewBox={`0 0 ${scene.width} ${scene.height}`} width="100%">
            <Defs>
              <LinearGradient id="terrain-fill" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor="#D8C59A" />
                <Stop offset="0.58" stopColor="#9EB47A" />
                <Stop offset="1" stopColor="#61704E" />
              </LinearGradient>
              <LinearGradient id="scene-sky" x1="0" x2="1" y1="0" y2="1">
                <Stop offset="0" stopColor="#D9E8F3" />
                <Stop offset="1" stopColor="#F9F5E8" />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#scene-sky)" height={scene.height} rx="26" ry="26" width={scene.width} />
            <Path d={scene.terrainPath} fill="url(#terrain-fill)" opacity="0.92" />
            <Path
              d={scene.terrainPath}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="3"
            />
            <Path
              d={scene.ridgePath}
              fill="none"
              stroke="rgba(255,255,255,0.96)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="13"
            />
            <Path
              d={scene.ridgePath}
              fill="none"
              stroke="#D9562B"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
            <Circle
              cx={scene.projected[0]?.x ?? 0}
              cy={scene.projected[0]?.y ?? 0}
              fill="#F9FBF7"
              r="10"
              stroke="#2F6B46"
              strokeWidth="5"
            />
            <Circle
              cx={scene.projected[scene.projected.length - 1]?.x ?? 0}
              cy={scene.projected[scene.projected.length - 1]?.y ?? 0}
              fill="#F9FBF7"
              r="10"
              stroke="#D9562B"
              strokeWidth="5"
            />
          </Svg>
        ) : (
          <View style={styles.emptyScene}>
            <Text style={styles.emptySceneText}>
              {language === 'hu'
                ? 'Nincs elég magassági adat a terepnézethez.'
                : 'Not enough elevation data for the terrain view.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: 16,
    overflow: 'hidden',
    padding: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: 6,
    minWidth: 220,
  },
  eyebrow: {
    color: palette.highlight,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  description: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  badge: {
    backgroundColor: palette.accentStrong,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    color: palette.sandText,
    fontSize: 13,
    fontWeight: '800',
  },
  sceneCard: {
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyScene: {
    alignItems: 'center',
    minHeight: 240,
    justifyContent: 'center',
    padding: 20,
  },
  emptySceneText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
