import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getRouteTypeLabel, useI18n } from '../lib/i18n';
import { formatDistance, formatElevation } from '../lib/format';
import { useAppTheme } from '../lib/theme-context';
import type { DifficultyLevel, ElevationProfilePoint, HikeRouteType } from '../types/hikes';

type SceneViewHandle = {
  camera: {
    clone?: () => Record<string, unknown>;
    heading?: number;
    position?: {
      z?: number;
    };
    tilt?: number;
  };
  destroy: () => void;
  goTo: (target: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  when: () => Promise<unknown>;
};

type DestroyableHandle = {
  destroy: () => void;
};

type MapControlIcon = 'minus' | 'north' | 'pan' | 'plus' | 'tilt';

declare global {
  interface Window {
    $arcgis?: {
      import: (modules: string[]) => Promise<unknown[]>;
    };
  }
}

function loadArcGisSdk(theme: 'dark' | 'light'): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('ArcGIS SceneView requires a browser environment.'));
  }

  const stylesheetId = 'arcgis-js-sdk-styles';
  const stylesheetHref = `https://js.arcgis.com/5.0/esri/themes/${theme}/main.css`;
  const existingStylesheet = document.getElementById(stylesheetId) as HTMLLinkElement | null;

  if (existingStylesheet) {
    existingStylesheet.href = stylesheetHref;
  } else {
    const stylesheet = document.createElement('link');
    stylesheet.href = stylesheetHref;
    stylesheet.id = stylesheetId;
    stylesheet.rel = 'stylesheet';
    document.head.appendChild(stylesheet);
  }

  if (window.$arcgis) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const scriptId = 'arcgis-js-sdk';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('ArcGIS SDK failed to load.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://js.arcgis.com/5.0/';
    script.type = 'module';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('ArcGIS SDK failed to load.')), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export function TrailScenePreview({
  ascentMeters,
  difficulty,
  distanceMeters,
  durationSeconds,
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
  const { colors, resolvedTheme } = useAppTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneViewRef = useRef<SceneViewHandle | null>(null);
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [activeCameraTool] = useState<MapControlIcon | null>(null);
  const [hoveredProfilePoint, setHoveredProfilePoint] = useState<ElevationProfilePoint | null>(null);
  const routeCoordinates = useMemo(
    () =>
      elevationProfile.map((point) => [
        point.longitude,
        point.latitude,
        point.elevationMeters,
      ]),
    [elevationProfile]
  );
  const profileTotalDistance = elevationProfile[elevationProfile.length - 1]?.distanceMeters ?? 0;
  const hoveredProfileRatio =
    hoveredProfilePoint && profileTotalDistance > 0
      ? Math.min(1, Math.max(0, hoveredProfilePoint.distanceMeters / profileTotalDistance))
      : null;

  useEffect(() => {
    if (!containerRef.current || routeCoordinates.length < 2) {
      setSceneStatus('unavailable');
      return;
    }

    let isMounted = true;
    let sceneView: DestroyableHandle | null = null;
    let elevationProfileWidget: DestroyableHandle | null = null;
    let compassWidget: DestroyableHandle | null = null;
    let navigationToggleWidget: DestroyableHandle | null = null;
    let zoomWidget: DestroyableHandle | null = null;

    const initializeScene = async () => {
      try {
        setSceneStatus('loading');
        await loadArcGisSdk(resolvedTheme);
        const arcgis = window.$arcgis;

        if (!arcgis) {
          throw new Error('ArcGIS SDK is not available.');
        }

        const [
          Map,
          SceneView,
          GraphicsLayer,
          Graphic,
          Polyline,
          ElevationProfile,
          Zoom,
          NavigationToggle,
          Compass,
        ] = (await arcgis.import([
          '@arcgis/core/Map.js',
          '@arcgis/core/views/SceneView.js',
          '@arcgis/core/layers/GraphicsLayer.js',
          '@arcgis/core/Graphic.js',
          '@arcgis/core/geometry/Polyline.js',
          '@arcgis/core/widgets/ElevationProfile.js',
          '@arcgis/core/widgets/Zoom.js',
          '@arcgis/core/widgets/NavigationToggle.js',
          '@arcgis/core/widgets/Compass.js',
        ])) as Array<new (properties: Record<string, unknown>) => unknown>;

        if (!isMounted || !containerRef.current) {
          return;
        }

        const routeGeometry = new Polyline({
          hasZ: true,
          paths: [routeCoordinates],
          spatialReference: {
            wkid: 4326,
          },
        });
        const routeLayer = new GraphicsLayer({
          elevationInfo: {
            mode: 'on-the-ground',
          },
        });
        const routeGraphic = new Graphic({
          geometry: routeGeometry,
          symbol: {
            type: 'line-3d',
            symbolLayers: [
              {
                type: 'line',
                material: {
                  color: '#FF7A00',
                },
                size: '7px',
              },
            ],
          },
        });
        const elevationProfileGraphic = new Graphic({
          geometry: routeGeometry,
          symbol: {
            type: 'line-3d',
            symbolLayers: [
              {
                type: 'line',
                material: {
                  color: [255, 122, 0, 0],
                },
                size: '1px',
              },
            ],
          },
        });
        (routeLayer as { add: (graphic: unknown) => void }).add(routeGraphic);

        const map = new Map({
          basemap: 'hybrid',
          ground: 'world-elevation',
          layers: [routeLayer],
        });
        const nextSceneView = new SceneView({
          camera: {
            heading: 35,
            position: {
              latitude: routeCoordinates[0][1],
              longitude: routeCoordinates[0][0],
              z: 2600,
            },
            tilt: 67,
          },
          container: containerRef.current,
          environment: {
            atmosphereEnabled: true,
            starsEnabled: false,
          },
          map,
          qualityProfile: 'high',
          ui: {
            components: [],
          },
          viewingMode: 'global',
        });
        sceneView = nextSceneView as SceneViewHandle;
        sceneViewRef.current = nextSceneView as SceneViewHandle;

        await (nextSceneView as SceneViewHandle).when();
        await (nextSceneView as SceneViewHandle).goTo(
          {
            target: routeGraphic,
            tilt: 68,
          },
          {
            duration: 1200,
          }
        );

        zoomWidget = new Zoom({
          view: nextSceneView,
        }) as DestroyableHandle;
        navigationToggleWidget = new NavigationToggle({
          layout: 'vertical',
          view: nextSceneView,
        }) as DestroyableHandle;
        compassWidget = new Compass({
          view: nextSceneView,
        }) as DestroyableHandle;
        const sceneUi = (
          nextSceneView as {
            ui: {
              add: (widget: unknown, position: string) => void;
            };
          }
        ).ui;
        sceneUi.add(zoomWidget, 'top-left');
        sceneUi.add(navigationToggleWidget, 'top-left');
        sceneUi.add(compassWidget, 'top-left');

        if (profileContainerRef.current) {
          elevationProfileWidget = new ElevationProfile({
            container: profileContainerRef.current,
            input: elevationProfileGraphic,
            profiles: [
              {
                color: '#FF7A00',
                type: 'ground',
              },
            ],
            view: nextSceneView,
            visibleElements: {
              legend: false,
              selectButton: false,
              settingsButton: false,
              sketchButton: false,
            },
          }) as DestroyableHandle;
        }

        if (isMounted) {
          setSceneStatus('ready');
        }
      } catch {
        if (isMounted) {
          setSceneStatus('unavailable');
        }
      }
    };

    void initializeScene();

    return () => {
      isMounted = false;

      if (sceneView) {
        sceneView.destroy();
      }

      if (elevationProfileWidget) {
        elevationProfileWidget.destroy();
      }

      if (zoomWidget) {
        zoomWidget.destroy();
      }

      if (navigationToggleWidget) {
        navigationToggleWidget.destroy();
      }

      if (compassWidget) {
        compassWidget.destroy();
      }

      sceneViewRef.current = null;
    };
  }, [resolvedTheme, routeCoordinates]);

  const title = language === 'hu' ? 'Valódi 3D tereptérkép' : 'Real 3D terrain map';
  const description =
    language === 'hu'
      ? 'ArcGIS SceneView alapú 3D térkép world-elevation tereppel, a GPX útvonallal a felszínre illesztve.'
      : 'ArcGIS SceneView with world-elevation terrain and the GPX route draped on the ground.';

  const handleProfileMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (elevationProfile.length === 0 || profileTotalDistance <= 0) {
      setHoveredProfilePoint(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const targetDistance = ratio * profileTotalDistance;
    const nearestPoint = elevationProfile.reduce((nearest, point) =>
      Math.abs(point.distanceMeters - targetDistance) <
      Math.abs(nearest.distanceMeters - targetDistance)
        ? point
        : nearest
    );

    setHoveredProfilePoint(nearestPoint);
  };

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: resolvedTheme === 'dark' ? '#111820' : colors.panel,
          borderColor:
            resolvedTheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(52,72,59,0.18)',
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={[styles.eyebrow, { color: colors.highlight }]}>ArcGIS SceneView</Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.highlightSoft }]}>
          <Text style={[styles.badgeText, { color: colors.highlightText }]}>
            {getRouteTypeLabel(routeType, t)}
          </Text>
        </View>
      </View>

      <View style={styles.sceneFrame}>
        <div ref={containerRef} style={domStyles.sceneContainer} />
        <View style={styles.mapControls}>
          <View style={styles.toolControlGroup}>
            <MapControlButton
              label="↔"
              accessibilityLabel={language === 'hu' ? 'Terkep mozgatasa' : 'Pan map'}
              active={activeCameraTool === 'pan'}
              icon="pan"
              onPress={() => {}}
            />
            <View style={styles.controlDivider} />
            <MapControlButton
              label="◔"
              accessibilityLabel={language === 'hu' ? 'Dolesszog allitasa' : 'Adjust tilt'}
              active={activeCameraTool === 'tilt'}
              icon="tilt"
              onPress={() => {}}
            />
          </View>
          <MapControlButton
            label="⌖"
            accessibilityLabel={language === 'hu' ? 'Iranyba allitas' : 'Reset direction'}
            icon="north"
            onPress={() => {}}
            round
          />
        </View>
        {sceneStatus !== 'ready' ? (
          <View pointerEvents="none" style={styles.sceneOverlay}>
            <Text style={styles.sceneOverlayText}>
              {sceneStatus === 'loading'
                ? language === 'hu'
                  ? '3D terep betöltése...'
                  : 'Loading 3D terrain...'
                : language === 'hu'
                  ? 'A 3D térkép nem érhető el ezen a környezeten.'
                  : 'The 3D map is not available in this environment.'}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.profilePanel,
          {
            backgroundColor:
              resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(32,49,38,0.06)',
            borderColor:
              resolvedTheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(52,72,59,0.14)',
          },
        ]}
      >
        <View style={styles.profileHeader}>
          <Text style={[styles.profileTitle, { color: colors.text }]}>
            {language === 'hu' ? 'Magasságprofil' : 'Elevation profile'}
          </Text>
          <Text style={[styles.profileDescription, { color: colors.textMuted }]}>
            {language === 'hu'
              ? 'A RalucaNicola demo mintájára az ArcGIS ElevationProfile a 3D nézet terepéből mintavételez.'
              : 'Following the RalucaNicola demo, ArcGIS ElevationProfile samples the active 3D terrain.'}
          </Text>
        </View>
        <div style={domStyles.profileInteractionFrame}>
          <div ref={profileContainerRef} style={domStyles.profileContainer} />
          <div
            onMouseLeave={() => setHoveredProfilePoint(null)}
            onMouseMove={handleProfileMouseMove}
            style={domStyles.profileMouseCapture}
          />
          {hoveredProfilePoint && hoveredProfileRatio !== null ? (
            <div
              style={{
                ...domStyles.profileHoverLine,
                left: `${hoveredProfileRatio * 100}%`,
              }}
            />
          ) : null}
          {hoveredProfilePoint && hoveredProfileRatio !== null ? (
            <div
              style={{
                ...domStyles.profileHoverCard,
                left: `${hoveredProfileRatio * 100}%`,
                transform:
                  hoveredProfileRatio > 0.72
                    ? 'translateX(-100%)'
                    : hoveredProfileRatio < 0.18
                      ? 'translateX(0)'
                      : 'translateX(-50%)',
              }}
            >
              <span style={domStyles.profileHoverLabel}>
                {language === 'hu' ? 'Magasság' : 'Elevation'}
              </span>
              <strong style={domStyles.profileHoverValue}>
                {formatElevation(hoveredProfilePoint.elevationMeters)}
              </strong>
              <span style={domStyles.profileHoverMeta}>
                {formatDistance(hoveredProfilePoint.distanceMeters)}
              </span>
            </div>
          ) : null}
        </div>
      </View>
    </View>
  );
}

function MapControlButton({
  accessibilityLabel,
  active = false,
  icon,
  label,
  onPress,
  round = false,
}: {
  accessibilityLabel?: string;
  active?: boolean;
  icon?: MapControlIcon;
  label?: string;
  onPress: () => void;
  round?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.mapControlButton,
        active && styles.mapControlButtonActive,
        round && styles.mapControlButtonRound,
        pressed && styles.mapControlButtonPressed,
      ]}
    >
      {icon ? (
        <ControlIcon type={icon} />
      ) : (
        <Text style={[styles.mapControlButtonText, round && styles.mapControlButtonRoundText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function ControlIcon({ type }: { type: MapControlIcon }) {
  if (type === 'plus') {
    return (
      <View style={styles.iconBox}>
        <View style={styles.iconLineHorizontal} />
        <View style={styles.iconLineVertical} />
      </View>
    );
  }

  if (type === 'minus') {
    return (
      <View style={styles.iconBox}>
        <View style={styles.iconLineHorizontal} />
      </View>
    );
  }

  if (type === 'pan') {
    return (
      <View style={styles.iconBox}>
        <View style={styles.iconLineHorizontal} />
        <View style={styles.iconLineVertical} />
        <View style={[styles.iconDot, styles.iconDotTop]} />
        <View style={[styles.iconDot, styles.iconDotRight]} />
        <View style={[styles.iconDot, styles.iconDotBottom]} />
        <View style={[styles.iconDot, styles.iconDotLeft]} />
      </View>
    );
  }

  if (type === 'tilt') {
    return (
      <View style={styles.tiltIcon}>
        <View style={styles.tiltPlane} />
        <View style={styles.tiltNeedle} />
      </View>
    );
  }

  return <Text style={styles.northIconText}>N</Text>;
}

const domStyles: Record<string, CSSProperties> = {
  sceneContainer: {
    height: '100%',
    width: '100%',
  },
  profileInteractionFrame: {
    cursor: 'crosshair',
    position: 'relative',
  },
  profileContainer: {
    height: 230,
    width: '100%',
  },
  profileMouseCapture: {
    bottom: 0,
    cursor: 'crosshair',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  profileHoverLine: {
    background: 'var(--hm-highlight, #C9792E)',
    bottom: 0,
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    width: 2,
    zIndex: 4,
  },
  profileHoverCard: {
    backdropFilter: 'blur(14px)',
    background: 'var(--hm-panel, #F6F9F1)',
    border: '1px solid var(--hm-border, #C4D1BE)',
    borderRadius: 14,
    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.28)',
    display: 'grid',
    gap: 2,
    minWidth: 112,
    padding: '9px 11px',
    pointerEvents: 'none',
    position: 'absolute',
    top: 12,
    zIndex: 5,
  },
  profileHoverLabel: {
    color: 'var(--hm-text-muted, #60705E)',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  profileHoverValue: {
    color: 'var(--hm-highlight, #C9792E)',
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.05,
  },
  profileHoverMeta: {
    color: 'var(--hm-text-muted, #60705E)',
    fontSize: 12,
    fontWeight: 700,
  },
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#111820',
    borderColor: 'rgba(255,255,255,0.16)',
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
    color: 'var(--hm-highlight, #C9792E)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: 'var(--hm-text, #203126)',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  description: {
    color: 'var(--hm-text-muted, #60705E)',
    fontSize: 14,
    lineHeight: 21,
  },
  badge: {
    backgroundColor: 'rgba(249,115,22,0.16)',
    borderColor: 'rgba(249,115,22,0.38)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    color: 'var(--hm-highlight-text, #5E3813)',
    fontSize: 13,
    fontWeight: '800',
  },
  sceneFrame: {
    backgroundColor: '#0B1117',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    borderWidth: 1,
    height: 680,
    overflow: 'hidden',
  },
  mapControls: {
    display: 'none',
    gap: 14,
    left: 18,
    position: 'absolute',
    top: 18,
    zIndex: 10,
  },
  zoomControlGroup: {
    backgroundColor: 'var(--hm-input-background, #E6EEDF)',
    borderColor: 'var(--hm-border, #C4D1BE)',
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  toolControlGroup: {
    backgroundColor: 'var(--hm-input-background, #E6EEDF)',
    borderColor: 'var(--hm-border, #C4D1BE)',
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  controlDivider: {
    backgroundColor: 'var(--hm-border, #C4D1BE)',
    height: 1,
  },
  mapControlButton: {
    alignItems: 'center',
    backgroundColor: 'var(--hm-input-background, #E6EEDF)',
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  mapControlButtonActive: {
    backgroundColor: 'var(--hm-panel-raised, #ECF3E4)',
  },
  mapControlButtonRound: {
    borderColor: 'rgba(32,49,38,0.1)',
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  mapControlButtonPressed: {
    backgroundColor: 'var(--hm-panel, #F6F9F1)',
  },
  mapControlButtonText: {
    color: 'var(--hm-text, #203126)',
    fontSize: 31,
    fontWeight: '300',
    lineHeight: 34,
  },
  mapControlButtonRoundText: {
    color: 'var(--hm-text-muted, #60705E)',
    fontSize: 28,
    fontWeight: '600',
  },
  iconBox: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    width: 30,
  },
  iconLineHorizontal: {
    backgroundColor: 'var(--hm-text, #203126)',
    height: 2,
    position: 'absolute',
    width: 26,
  },
  iconLineVertical: {
    backgroundColor: 'var(--hm-text, #203126)',
    height: 26,
    position: 'absolute',
    width: 2,
  },
  iconDot: {
    backgroundColor: 'var(--hm-text, #203126)',
    borderRadius: 999,
    height: 5,
    position: 'absolute',
    width: 5,
  },
  iconDotBottom: {
    bottom: 0,
  },
  iconDotLeft: {
    left: 0,
  },
  iconDotRight: {
    right: 0,
  },
  iconDotTop: {
    top: 0,
  },
  tiltIcon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    width: 32,
  },
  tiltNeedle: {
    backgroundColor: 'var(--hm-text, #203126)',
    height: 24,
    position: 'absolute',
    transform: [{ rotate: '-26deg' }],
    width: 2,
  },
  tiltPlane: {
    backgroundColor: 'var(--hm-text, #203126)',
    height: 2,
    position: 'absolute',
    top: 20,
    transform: [{ rotate: '-12deg' }],
    width: 28,
  },
  northIconText: {
    color: 'var(--hm-text, #203126)',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  sceneOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(11,17,23,0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sceneOverlayText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  profilePanel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileHeader: {
    gap: 5,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  profileTitle: {
    color: 'var(--hm-text, #203126)',
    fontSize: 17,
    fontWeight: '900',
  },
  profileDescription: {
    color: 'var(--hm-text-muted, #60705E)',
    fontSize: 13,
    lineHeight: 19,
  },
});
