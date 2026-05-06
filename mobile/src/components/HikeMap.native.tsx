import Constants from 'expo-constants';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { HikeRoutePreviewCard } from './HikeRoutePreviewCard';
import { RouteCollectionPreviewGraphic } from './RouteCollectionPreviewGraphic';
import {
  countHikesInBounds,
  getBoundsFromRegion,
  getCombinedBounds,
  getMapRegion,
  getNearestElevationProfilePoint,
  getNearestHikeIdToCoordinate,
} from '../lib/geo';
import { useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import type { RouteMapProps } from '../types/hikes';

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
}: RouteMapProps) {
  const { t } = useI18n();
  const [previewedHikeId, setPreviewedHikeId] = useState<string | null>(null);
  const [visibleHikeCount, setVisibleHikeCount] = useState(hikes.length);
  const hasHikes = hikes.length > 0;
  const selectedHike = hasHikes ? hikes.find((hike) => hike.id === selectedHikeId) ?? hikes[0] : null;
  const previewedHike = hasHikes ? hikes.find((hike) => hike.id === previewedHikeId) ?? null : null;
  const fallbackPreviewHike = previewedHike ?? selectedHike;
  const region = useMemo(
    () => (hasHikes ? getMapRegion(getCombinedBounds(hikes)) : null),
    [hasHikes, hikes]
  );
  const hasGoogleMapsApiKey = Boolean(
    Constants.expoConfig?.extra?.hasGoogleMapsApiKey ??
      Constants.expoConfig?.android?.config?.googleMaps?.apiKey
  );
  const useNativeAndroidMap = Constants.expoConfig?.extra?.useNativeAndroidMap === true;
  const useNativeGoogleMap =
    Platform.OS !== 'android' || (hasGoogleMapsApiKey && useNativeAndroidMap);
  const startPoint = selectedHike?.points[0];
  const endPoint = selectedHike?.points[selectedHike.points.length - 1];
  const mapKey = hikes.map((hike) => hike.id).join(':');
  const englishPluralSuffix = visibleHikeCount === 1 ? '' : 's';
  const hasProfileSync = profilePoints.length > 0 && Boolean(onFocusedProfilePointChange);

  const reportVisibleHikeCount = (count: number) => {
    setVisibleHikeCount(count);
    onVisibleHikeCountChange?.(count);
  };

  const syncFocusedProfilePoint = (
    coordinate: { latitude: number; longitude: number } | undefined
  ) => {
    if (!hasProfileSync || !coordinate) {
      return;
    }

    onFocusedProfilePointChange?.(
      getNearestElevationProfilePoint(profilePoints, coordinate)
    );
  };

  useEffect(() => {
    if (!useNativeGoogleMap) {
      setPreviewedHikeId(null);
      reportVisibleHikeCount(hikes.length);
      return;
    }

    if (!hasHikes || !region) {
      setPreviewedHikeId(null);
      reportVisibleHikeCount(0);
      return;
    }

    if (previewedHikeId && !hikes.some((hike) => hike.id === previewedHikeId)) {
      setPreviewedHikeId(null);
    }

    reportVisibleHikeCount(countHikesInBounds(hikes, getBoundsFromRegion(region)));
  }, [hasHikes, hikes, onVisibleHikeCountChange, previewedHikeId, region, useNativeGoogleMap]);

  if (!hasHikes || !region || !selectedHike) {
    return <View style={[styles.frame, { height }]} />;
  }

  if (!useNativeGoogleMap) {
    return (
      <View style={[styles.frame, styles.fallbackFrame, { height }]}>
        <RouteCollectionPreviewGraphic
          focusedProfilePoint={focusedProfilePoint}
          hikes={hikes}
          height={height}
          selectedHikeId={selectedHike.id}
        />

        <View pointerEvents="none" style={styles.fallbackNotice}>
          <Text style={styles.fallbackNoticeTitle}>{t('mapFallbackTitle')}</Text>
          <Text style={styles.fallbackNoticeBody}>{t('mapFallbackBody')}</Text>
        </View>

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

        {showRoutePreview && fallbackPreviewHike ? (
          <View pointerEvents="none" style={styles.previewOverlay}>
            <HikeRoutePreviewCard hike={fallbackPreviewHike} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.frame, { height }]}>
      <MapView
        initialRegion={region}
        key={mapKey}
        loadingEnabled
        onPress={(event) => {
          syncFocusedProfilePoint(event.nativeEvent.coordinate);
        }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        onLongPress={(event) => {
          syncFocusedProfilePoint(event.nativeEvent.coordinate);

          if (!showRoutePreview) {
            return;
          }

          const nearestHikeId = getNearestHikeIdToCoordinate(hikes, event.nativeEvent.coordinate);

          if (nearestHikeId) {
            setPreviewedHikeId(nearestHikeId);
            return;
          }

          setPreviewedHikeId(null);
        }}
        onRegionChangeComplete={(nextRegion) => {
          reportVisibleHikeCount(countHikesInBounds(hikes, getBoundsFromRegion(nextRegion)));
        }}
        scrollEnabled
        showsCompass
        showsScale
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        zoomEnabled
      >
        {hikes.map((hike) => {
          const isSelected = hike.id === selectedHike?.id;
          const coordinates = hike.points.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          }));

          return (
            <Fragment key={hike.id}>
              {isSelected ? (
                <Polyline
                  coordinates={coordinates}
                  strokeColor={palette.highlightSoft}
                  strokeWidth={10}
                  tappable={false}
                  zIndex={2}
                />
              ) : null}
              <Polyline
                coordinates={coordinates}
                onPress={(event) => {
                  syncFocusedProfilePoint(event.nativeEvent.coordinate);
                  onSelectHike?.(hike.id);
                }}
                strokeColor={isSelected ? palette.highlight : 'rgba(47, 107, 70, 0.42)'}
                strokeWidth={isSelected ? 6 : 3}
                tappable={Boolean(onSelectHike || hasProfileSync)}
                zIndex={isSelected ? 3 : 1}
              />
            </Fragment>
          );
        })}

        {showMarkers && startPoint ? (
          <Marker
            coordinate={{
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
            }}
            pinColor={palette.accentStrong}
            title={t('commonStart')}
          />
        ) : null}

        {showMarkers && endPoint ? (
          <Marker
            coordinate={{
              latitude: endPoint.latitude,
              longitude: endPoint.longitude,
            }}
            pinColor={palette.highlight}
            title={t('commonFinish')}
          />
        ) : null}

        {focusedProfilePoint ? (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={{
              latitude: focusedProfilePoint.latitude,
              longitude: focusedProfilePoint.longitude,
            }}
            tracksViewChanges={false}
          >
            <View style={styles.focusMarkerOuter}>
              <View style={styles.focusMarkerInner} />
            </View>
          </Marker>
        ) : null}
      </MapView>

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
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 26,
    overflow: 'hidden',
  },
  fallbackFrame: {
    backgroundColor: '#EAF1E3',
    justifyContent: 'center',
  },
  fallbackNotice: {
    backgroundColor: 'rgba(246,249,241,0.94)',
    borderColor: '#CFDBC7',
    borderRadius: 18,
    borderWidth: 1,
    left: 14,
    maxWidth: 320,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    top: 14,
  },
  fallbackNoticeTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  fallbackNoticeBody: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
    color: '#F8FBF9',
    fontSize: 12,
    fontWeight: '700',
  },
  previewOverlay: {
    bottom: 14,
    left: 14,
    position: 'absolute',
    right: 14,
  },
  focusMarkerOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(244,250,241,0.94)',
    borderColor: palette.accentStrong,
    borderRadius: 999,
    borderWidth: 3,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  focusMarkerInner: {
    backgroundColor: palette.accentStrong,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
});
