import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'leaflet/dist/leaflet.css';

import { HikeRoutePreviewCard } from './HikeRoutePreviewCard';
import { countHikesInBounds, getNearestElevationProfilePoint } from '../lib/geo';
import { useI18n } from '../lib/i18n';
import { lightPalette, palette } from '../lib/theme';
import type { HikeBounds, RouteMapProps } from '../types/hikes';

export function HikeMap({
  hikes,
  height = 280,
  selectedHikeId = null,
  showMarkers = true,
  focusedProfilePoint = null,
  profilePoints = [],
  onSelectHike,
  onVisibleHikeCountChange,
  onFocusedProfilePointChange,
  showRoutePreview = false,
  showVisibleCount = false,
  useLightRouteColors = false,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const routeLayersRef = useRef<any[]>([]);
  const markerLayersRef = useRef<any[]>([]);
  const focusedMarkerRef = useRef<any>(null);
  const hikesRef = useRef(hikes);
  const onVisibleHikeCountChangeRef = useRef(onVisibleHikeCountChange);
  const hoverTimerRef = useRef<number | null>(null);
  const lastHikeKeyRef = useRef('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [previewedHikeId, setPreviewedHikeId] = useState<string | null>(null);
  const [visibleHikeCount, setVisibleHikeCount] = useState(hikes.length);
  const { t } = useI18n();

  const previewedHike = hikes.find((hike) => hike.id === previewedHikeId) ?? null;
  const routeColors = useLightRouteColors ? lightPalette : palette;
  const englishPluralSuffix = visibleHikeCount === 1 ? '' : 's';
  const hasProfileSync = profilePoints.length > 0 && Boolean(onFocusedProfilePointChange);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const reportVisibleHikeCount = (count: number) => {
    setVisibleHikeCount(count);
    onVisibleHikeCountChangeRef.current?.(count);
  };

  const syncFocusedProfilePoint = (latlng: { lat: number; lng: number } | undefined) => {
    if (!hasProfileSync || !latlng) {
      return;
    }

    onFocusedProfilePointChange?.(
      getNearestElevationProfilePoint(profilePoints, {
        latitude: latlng.lat,
        longitude: latlng.lng,
      })
    );
  };

  const updateVisibleCountFromMap = () => {
    if (!mapRef.current) {
      reportVisibleHikeCount(hikesRef.current.length);
      return;
    }

    const bounds = mapRef.current.getBounds();
    const visibleBounds: HikeBounds = {
      minLatitude: bounds.getSouth(),
      maxLatitude: bounds.getNorth(),
      minLongitude: bounds.getWest(),
      maxLongitude: bounds.getEast(),
    };

    reportVisibleHikeCount(countHikesInBounds(hikesRef.current, visibleBounds));
  };

  useEffect(() => {
    hikesRef.current = hikes;
  }, [hikes]);

  useEffect(() => {
    onVisibleHikeCountChangeRef.current = onVisibleHikeCountChange;
  }, [onVisibleHikeCountChange]);

  useEffect(() => {
    if (!showRoutePreview) {
      setPreviewedHikeId(null);
    }
  }, [showRoutePreview]);

  useEffect(() => {
    if (previewedHikeId && !hikes.some((hike) => hike.id === previewedHikeId)) {
      setPreviewedHikeId(null);
    }

    if (hikes.length === 0) {
      reportVisibleHikeCount(0);
    }
  }, [hikes, previewedHikeId]);

  useEffect(() => {
    let isDisposed = false;

    const initializeMap = async () => {
      if (mapRef.current || !containerRef.current) {
        return;
      }

      const leaflet: any = await import('leaflet');

      if (isDisposed || !containerRef.current || mapRef.current) {
        return;
      }

      leafletRef.current = leaflet;

      const map = leaflet.map(containerRef.current, {
        attributionControl: true,
        scrollWheelZoom: true,
        zoomControl: true,
      });

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        })
        .addTo(map);

      map.createPane('route-hitbox-pane');
      const hitboxPane = map.getPane('route-hitbox-pane');

      if (hitboxPane) {
        hitboxPane.style.zIndex = '460';
        hitboxPane.style.pointerEvents = 'auto';
      }

      map.on('moveend zoomend', updateVisibleCountFromMap);
      map.on('movestart zoomstart', clearHoverTimer);
      mapRef.current = map;
      setIsMapReady(true);
    };

    void initializeMap();

    return () => {
      isDisposed = true;
      clearHoverTimer();

      if (mapRef.current) {
        mapRef.current.off('moveend zoomend', updateVisibleCountFromMap);
        mapRef.current.off('movestart zoomstart', clearHoverTimer);
        mapRef.current.remove();
        mapRef.current = null;
      }

      routeLayersRef.current = [];
      markerLayersRef.current = [];
      focusedMarkerRef.current = null;
      leafletRef.current = null;
      setIsMapReady(false);

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;

    if (!isMapReady || !map || !leaflet) {
      return;
    }

    routeLayersRef.current.forEach((layer) => layer.remove());
    markerLayersRef.current.forEach((layer) => layer.remove());
    routeLayersRef.current = [];
    markerLayersRef.current = [];

    if (hikes.length === 0) {
      reportVisibleHikeCount(0);
      return;
    }

    const selectedHike = hikes.find((hike) => hike.id === selectedHikeId) ?? hikes[0];
    const hikeKey = hikes.map((hike) => hike.id).join(':');
    const shouldFitBounds = hikeKey !== lastHikeKeyRef.current;

    const showPreview = (hikeId: string) => {
      if (!showRoutePreview) {
        return;
      }

      clearHoverTimer();
      setPreviewedHikeId(hikeId);
    };

    const clearPreviewForHike = (hikeId: string) => {
      clearHoverTimer();
      setPreviewedHikeId((current) => (current === hikeId ? null : current));
    };

    const bindRoutePreviewEvents = (layer: any, hikeId: string) => {
      layer.on('mousemove', (event: { latlng: { lat: number; lng: number } }) => {
        syncFocusedProfilePoint(event.latlng);
        showPreview(hikeId);
      });
      layer.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        syncFocusedProfilePoint(event.latlng);
      });
      layer.on('mouseover', () => showPreview(hikeId));
      layer.on('mousedown', () => showPreview(hikeId));
      layer.on('mouseout', () => clearPreviewForHike(hikeId));
      layer.on('mouseup', clearHoverTimer);
      layer.on('touchstart', () => showPreview(hikeId));
      layer.on('touchend touchcancel', clearHoverTimer);
    };

    const orderedHikes = [
      ...hikes.filter((hike) => hike.id !== selectedHike.id),
      ...hikes.filter((hike) => hike.id === selectedHike.id),
    ];
    const allPolylines = orderedHikes.map((hike) => {
      const isSelected = hike.id === selectedHike.id;
      const coordinates = hike.points.map(
        (point) => [point.latitude, point.longitude] as [number, number]
      );
      const selectionHalo = isSelected
        ? leaflet.polyline(coordinates, {
            color: routeColors.highlightSoft,
            interactive: false,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 0.98,
            weight: 11,
          })
        : null;

      const polyline = leaflet.polyline(coordinates, {
        color: isSelected ? routeColors.highlight : routeColors.routeBase,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: isSelected ? 1 : 0.94,
        weight: isSelected ? 6.5 : 3.5,
      });
      const hitbox = leaflet.polyline(coordinates, {
        color: '#000000',
        interactive: true,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.01,
        pane: 'route-hitbox-pane',
        weight: 20,
      });

      if (selectionHalo) {
        selectionHalo.addTo(map);
      }

      if (onSelectHike) {
        polyline.on('click', () => onSelectHike(hike.id));
        hitbox.on('click', () => onSelectHike(hike.id));
      }

      bindRoutePreviewEvents(polyline, hike.id);
      bindRoutePreviewEvents(hitbox, hike.id);
      polyline.addTo(map);
      hitbox.addTo(map);

      return selectionHalo ? [selectionHalo, polyline, hitbox] : [polyline, hitbox];
    });

    routeLayersRef.current = allPolylines.flat();

    if (routeLayersRef.current.length > 0 && shouldFitBounds) {
      const routeGroup = leaflet.featureGroup(routeLayersRef.current);
      map.fitBounds(routeGroup.getBounds(), {
        padding: [28, 28],
      });
    } else {
      updateVisibleCountFromMap();
    }

    lastHikeKeyRef.current = hikeKey;

    const startPoint = selectedHike.points[0];
    const finishPoint = selectedHike.points[selectedHike.points.length - 1];

    if (showMarkers && startPoint) {
      const startMarker = leaflet
        .circleMarker([startPoint.latitude, startPoint.longitude], {
          color: palette.sandText,
          fillColor: palette.accentStrong,
          fillOpacity: 1,
          radius: 8,
          weight: 3,
        })
        .addTo(map)
        .bindTooltip(t('commonStart'));

      markerLayersRef.current.push(startMarker);
    }

    if (showMarkers && finishPoint) {
      const finishMarker = leaflet
        .circleMarker([finishPoint.latitude, finishPoint.longitude], {
          color: palette.sandText,
          fillColor: routeColors.highlight,
          fillOpacity: 1,
          radius: 8,
          weight: 3,
        })
        .addTo(map)
        .bindTooltip(t('commonFinish'));

      markerLayersRef.current.push(finishMarker);
    }

    return () => {
      clearHoverTimer();
    };
  }, [hikes, isMapReady, onSelectHike, selectedHikeId, showMarkers, showRoutePreview, t, useLightRouteColors]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;

    if (!isMapReady || !map || !leaflet) {
      return;
    }

    if (!focusedProfilePoint) {
      if (focusedMarkerRef.current) {
        focusedMarkerRef.current.remove();
        focusedMarkerRef.current = null;
      }

      return;
    }

    const nextLatLng = [focusedProfilePoint.latitude, focusedProfilePoint.longitude];

    if (focusedMarkerRef.current) {
      focusedMarkerRef.current.setLatLng(nextLatLng);
      return;
    }

    focusedMarkerRef.current = leaflet
      .circleMarker(nextLatLng, {
        color: palette.sandText,
        fillColor: palette.accentStrong,
        fillOpacity: 1,
        radius: 8,
        weight: 4,
      })
      .addTo(map);
  }, [focusedProfilePoint, isMapReady]);

  return (
    <View style={[styles.frame, { height }]}>
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
        }}
      />

      {showVisibleCount ? (
        <View pointerEvents="none" style={styles.counterOverlay}>
          <View style={styles.counterChip}>
            <Text style={styles.counterText}>
              {t('homeMapSubtitle', {
                count: visibleHikeCount,
                suffix: englishPluralSuffix,
              })}
            </Text>
          </View>
        </View>
      ) : null}

      {showRoutePreview && previewedHike ? (
        <View pointerEvents="none" style={styles.previewOverlay}>
          <HikeRoutePreviewCard hike={previewedHike} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
  },
  counterOverlay: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  counterChip: {
    backgroundColor: 'rgba(31, 43, 34, 0.82)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterText: {
    color: palette.sandText,
    fontSize: 12,
    fontWeight: '700',
  },
  previewOverlay: {
    bottom: 14,
    left: 14,
    position: 'absolute',
    right: 14,
  },
});
