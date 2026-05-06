import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppTopBar } from '../src/components/AppTopBar';
import { FeaturedHikeCard } from '../src/components/FeaturedHikeCard';
import { HikeMap } from '../src/components/HikeMap';
import { areHikeImportsEnabled, isReadOnlyMode } from '../src/lib/app-features';
import { formatDateTime, formatDistance, formatDuration, formatElevation } from '../src/lib/format';
import {
  getDifficultyLabel,
  getLanguageDisplayLabel,
  getRouteTypeLabel,
  getSourceTypeLabel,
  useI18n,
} from '../src/lib/i18n';
import { importHikeFromUrl, pickAndImportHike } from '../src/lib/hike-import';
import { getHikeInsights } from '../src/lib/hike-insights';
import { downloadPublicHikeFeed } from '../src/lib/public-hikes-feed';
import {
  initializeHikeStore,
  listHikeRecords,
  listHikes,
} from '../src/lib/hikes-store';
import { palette } from '../src/lib/theme';
import type { AppLanguage, HikeRecord, HikeSummary } from '../src/types/hikes';

type ImportAction = 'file' | 'url' | 'shared-link' | null;
type PublishAction = 'export-feed' | null;

function readSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function Metric({
  label,
  value,
  compact = false,
  emphasize = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
  emphasize?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        compact && styles.metricCardCompact,
        emphasize && styles.metricCardEmphasis,
      ]}
    >
      <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          compact && styles.metricValueCompact,
          emphasize && styles.metricValueEmphasis,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoChip({
  label,
  accent = false,
}: {
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.infoChip, accent && styles.infoChipAccent]}>
      <Text style={[styles.infoChipText, accent && styles.infoChipTextAccent]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ importUrl?: string | string[] }>();
  const { language, locale, setLanguage, t } = useI18n();
  const { width } = useWindowDimensions();
  const importsEnabled = areHikeImportsEnabled();
  const readOnlyMode = isReadOnlyMode();
  const [hikes, setHikes] = useState<HikeSummary[]>([]);
  const [hikeRecords, setHikeRecords] = useState<HikeRecord[]>([]);
  const [selectedHikeId, setSelectedHikeId] = useState<string | null>(null);
  const [visibleHikeCount, setVisibleHikeCount] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<ImportAction>(null);
  const [activePublishAction, setActivePublishAction] = useState<PublishAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastImportedQueryRef = useRef<string | null>(null);

  const selectedHike = useMemo(
    () => hikeRecords.find((hike) => hike.id === selectedHikeId) ?? null,
    [hikeRecords, selectedHikeId]
  );
  const hikeInsightsById = useMemo(
    () =>
      Object.fromEntries(
        hikeRecords.map((hike) => [hike.id, getHikeInsights(hike)])
      ) as Record<string, ReturnType<typeof getHikeInsights>>,
    [hikeRecords]
  );
  const selectedHikeInsights = selectedHike ? hikeInsightsById[selectedHike.id] ?? null : null;
  const isCompactSnapshotOverlay = width < 960;
  const isMobileSnapshotOverlay = width < 680;
  const mobileSnapshotWidth = Math.min(Math.max(width * 0.56, 176), 228);

  const overviewMetrics = useMemo(() => {
    const totalDistanceMeters = hikeRecords.reduce((total, hike) => total + hike.distanceMeters, 0);
    const totalAscentMeters = hikeRecords.reduce(
      (total, hike) => total + hike.elevationGainMeters,
      0
    );
    const highestPointMeters = hikeRecords.reduce<number | null>((highestPoint, hike) => {
      const candidate = hikeInsightsById[hike.id]?.highestElevationMeters ?? null;

      if (candidate === null) {
        return highestPoint;
      }

      if (highestPoint === null || candidate > highestPoint) {
        return candidate;
      }

      return highestPoint;
    }, null);

    return {
      totalDistanceMeters,
      totalAscentMeters,
      highestPointMeters,
    };
  }, [hikeInsightsById, hikeRecords]);

  const getFallbackError = () => t('homeError');

  const readErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return getFallbackError();
  };

  const refreshHikes = async (preferredHikeId?: string) => {
    await initializeHikeStore();
    const [summaries, records] = await Promise.all([listHikes(), listHikeRecords()]);
    const currentSelectionStillExists =
      selectedHikeId !== null && summaries.some((hike) => hike.id === selectedHikeId);
    const nextSelectedHikeId =
      preferredHikeId ??
      (currentSelectionStillExists ? selectedHikeId : null) ??
      summaries[0]?.id ??
      null;

    startTransition(() => {
      setHikes(summaries);
      setHikeRecords(records);
      setSelectedHikeId(nextSelectedHikeId);
    });
  };

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        await refreshHikes();
      } catch (error) {
        if (isActive) {
          setErrorMessage(readErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setVisibleHikeCount(hikeRecords.length);
  }, [hikeRecords.length]);

  useEffect(() => {
    const importUrl = readSingleParam(params.importUrl).trim();

    if (!importUrl || lastImportedQueryRef.current === importUrl) {
      return;
    }

    lastImportedQueryRef.current = importUrl;

    if (!importsEnabled) {
      setStatusMessage(null);
      setIsLoading(false);
      router.replace('/');
      return;
    }

    void (async () => {
      setErrorMessage(null);
      setStatusMessage(null);
      setActiveAction('shared-link');

      try {
        const hike = await importHikeFromUrl(importUrl);
        setStatusMessage(t('homeImportedShared', { title: hike.title }));
        await refreshHikes(hike.id);
        router.replace('/');
      } catch (error) {
        setErrorMessage(readErrorMessage(error));
      } finally {
        setActiveAction(null);
        setIsLoading(false);
      }
    })();
  }, [importsEnabled, params.importUrl, router, t]);

  const runImport = async (
    action: Exclude<ImportAction, null>,
    task: () => Promise<HikeRecord | null>,
    successMessageKey: 'homeImportedFile' | 'homeImportedUrl'
  ) => {
    if (!importsEnabled) {
      setErrorMessage(t('homeImportsDisabled'));
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setActiveAction(action);

    try {
      const hike = await task();

      if (!hike) {
        return;
      }

      setStatusMessage(t(successMessageKey, { title: hike.title }));

      if (hike.sourceType === 'url') {
        setUrlInput(hike.sourceValue);
      }

      await refreshHikes(hike.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setActiveAction(null);
      setIsLoading(false);
    }
  };

  const handleFileImport = async () => {
    await runImport('file', pickAndImportHike, 'homeImportedFile');
  };

  const handleUrlImport = async () => {
    await runImport('url', () => importHikeFromUrl(urlInput), 'homeImportedUrl');
  };

  const handlePublicFeedExport = async () => {
    if (Platform.OS !== 'web') {
      setErrorMessage('Public feed export is available only on web.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setActivePublishAction('export-feed');

    try {
      downloadPublicHikeFeed(hikeRecords);
      setStatusMessage(t('homeExportedPublicFeed'));
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setActivePublishAction(null);
    }
  };

  const openSelectedHike = () => {
    if (!selectedHikeId) {
      return;
    }

    router.push({
      pathname: '/hike/[id]',
      params: { id: selectedHikeId },
    });
  };

  const formatLocalizedDateTime = (value: string | null) =>
    formatDateTime(value, {
      locale,
      unavailableLabel: t('commonNotAvailable'),
    });

  const englishPluralSuffix = (count: number) => (count === 1 ? '' : 's');

  const changeLanguage = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === language) {
      return;
    }

    await setLanguage(nextLanguage);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppTopBar
        menuContent={
          <>
            {importsEnabled ? (
              <View style={styles.topMenuSection}>
                <Text style={styles.topMenuSectionTitle}>{t('navImportSection')}</Text>
                <Text style={styles.topMenuSectionBody}>{t('homeImportBody')}</Text>

                <Pressable
                  accessibilityRole="button"
                  disabled={activeAction !== null}
                  onPress={() => {
                    void handleFileImport();
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || activeAction !== null) && styles.primaryButtonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {activeAction === 'file' ? t('homeImportingFile') : t('homePickFile')}
                  </Text>
                </Pressable>

                <View style={styles.urlRow}>
                  <Text style={styles.fieldLabel}>{t('homeUrlFieldLabel')}</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setUrlInput}
                    placeholder={t('homeUrlPlaceholder')}
                    placeholderTextColor={palette.textMuted}
                    style={styles.urlInput}
                    value={urlInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={activeAction !== null}
                    onPress={() => {
                      void handleUrlImport();
                    }}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      (pressed || activeAction !== null) && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {activeAction === 'url' || activeAction === 'shared-link'
                        ? t('homeImporting')
                        : t('homeImportUrl')}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.helperText}>{t('homeCorsHint')}</Text>
              </View>
            ) : (
              <View style={styles.topMenuSection}>
                <Text style={styles.topMenuSectionTitle}>{t('homeReadOnlyTitle')}</Text>
                <Text style={styles.topMenuSectionBody}>{t('homeReadOnlyBody')}</Text>
              </View>
            )}

            <View style={styles.topMenuDivider} />

            {importsEnabled && Platform.OS === 'web' ? (
              <>
                <View style={styles.topMenuSection}>
                  <Text style={styles.topMenuSectionTitle}>{t('navPublishingSection')}</Text>
                  <Text style={styles.topMenuSectionBody}>{t('homeExportPublicFeedBody')}</Text>

                  <Pressable
                    accessibilityRole="button"
                    disabled={activePublishAction !== null}
                    onPress={() => {
                      void handlePublicFeedExport();
                    }}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      (pressed || activePublishAction !== null) && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {activePublishAction === 'export-feed'
                        ? t('homeExportingPublicFeed')
                        : t('homeExportPublicFeed')}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.topMenuDivider} />
              </>
            ) : null}

            <View style={styles.topMenuSection}>
              <Text style={styles.topMenuSectionTitle}>{t('navLanguageSection')}</Text>
              <View style={styles.languageOptions}>
                {(['en', 'hu'] as AppLanguage[]).map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    onPress={() => {
                      void changeLanguage(option);
                    }}
                    style={({ pressed }) => [
                      styles.languageOption,
                      language === option && styles.languageOptionActive,
                      pressed && styles.languageOptionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        language === option && styles.languageOptionTextActive,
                      ]}
                    >
                      {getLanguageDisplayLabel(option)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        }
        subtitle={t('homeHeroEyebrow')}
        title={t('appName')}
      />

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.bannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {statusMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.bannerText}>{statusMessage}</Text>
        </View>
      ) : null}

      {readOnlyMode ? (
        <View style={styles.infoBanner}>
          <Text style={styles.bannerText}>{t('homeReadOnlyBody')}</Text>
        </View>
      ) : null}

      <View style={styles.leadSection}>
        <View style={styles.hero}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.eyebrow}>{t('homeHeroEyebrow')}</Text>
            <Text style={styles.heroTitle}>{t('homeHeroTitle')}</Text>
          </View>

          <Text style={styles.heroBody}>{t('homeHeroBody')}</Text>
          <Text style={styles.heroFootnote}>{t('homeHeroFootnote')}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.accentStrong} />
          </View>
        ) : hikeRecords.length > 0 ? (
          <>
            <View style={styles.mapStage}>
              <HikeMap
                height={620}
                hikes={hikeRecords}
                onVisibleHikeCountChange={setVisibleHikeCount}
                onSelectHike={setSelectedHikeId}
                selectedHikeId={selectedHikeId}
                showMarkers
                showRoutePreview
              />

              <View
                pointerEvents="none"
                style={[
                  styles.snapshotOverlay,
                  isCompactSnapshotOverlay
                    ? styles.snapshotOverlayCompact
                    : styles.snapshotOverlayWide,
                  isMobileSnapshotOverlay && styles.snapshotOverlayMobile,
                  isMobileSnapshotOverlay ? { width: mobileSnapshotWidth } : null,
                ]}
              >
                <View
                  style={[
                    styles.heroSnapshot,
                    isCompactSnapshotOverlay
                      ? styles.heroSnapshotCompact
                      : styles.heroSnapshotWide,
                    isMobileSnapshotOverlay && styles.heroSnapshotMobile,
                  ]}
                >
                  <View
                    style={[
                      styles.heroSnapshotHeader,
                      isMobileSnapshotOverlay && styles.heroSnapshotHeaderCompact,
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroSnapshotTitle,
                        isMobileSnapshotOverlay && styles.heroSnapshotTitleCompact,
                      ]}
                    >
                      {t('homeCollectionSnapshot')}
                    </Text>
                    <Text
                      style={[
                        styles.heroSnapshotMeta,
                        isMobileSnapshotOverlay && styles.heroSnapshotMetaCompact,
                      ]}
                    >
                      {visibleHikeCount} | {formatDistance(overviewMetrics.totalDistanceMeters)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.heroSnapshotGrid,
                      isMobileSnapshotOverlay && styles.heroSnapshotGridCompact,
                    ]}
                  >
                    <Metric
                      compact={isMobileSnapshotOverlay}
                      emphasize
                      label={t('homeTracksShown')}
                      value={String(visibleHikeCount)}
                    />
                    <Metric
                      compact={isMobileSnapshotOverlay}
                      label={t('homeTotalDistance')}
                      value={formatDistance(overviewMetrics.totalDistanceMeters)}
                    />
                    <Metric
                      compact={isMobileSnapshotOverlay}
                      label={t('homeTotalAscent')}
                      value={formatElevation(overviewMetrics.totalAscentMeters)}
                    />
                    <Metric
                      compact={isMobileSnapshotOverlay}
                      label={t('homeHighestPoint')}
                      value={
                        overviewMetrics.highestPointMeters === null
                          ? t('commonNotAvailable')
                          : formatElevation(overviewMetrics.highestPointMeters)
                      }
                    />
                  </View>
                </View>
              </View>

              <View pointerEvents="none" style={styles.mapViewBadgeOverlay}>
                <View style={styles.mapViewBadge}>
                  <Text style={styles.mapViewBadgeLabel}>{t('homeMapViewLabel')}</Text>
                  <Text style={styles.mapViewBadgeValue}>
                    {t('homeMapViewCount', {
                      count: visibleHikeCount,
                      suffix: englishPluralSuffix(visibleHikeCount),
                    })}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.mapSupportRow}>
              <View style={styles.mapSupportCopy}>
                <Text style={styles.mapSupportTitle}>{t('homeMapTitle')}</Text>
                <Text style={styles.mapHint}>{t('homeMapHint')}</Text>
              </View>
              <View style={styles.mapLegendRow}>
                <InfoChip accent label={t('homeLegendSelected')} />
                <InfoChip label={t('homeLegendOtherRoutes')} />
              </View>
            </View>

            {selectedHike && selectedHikeInsights ? (
              <FeaturedHikeCard
                actionLabel={t('homeOpenDetails')}
                hike={selectedHike}
                insights={selectedHikeInsights}
                label={t('homeSelectedRoute')}
                onActionPress={openSelectedHike}
              />
            ) : (
              <View style={styles.featuredFallback}>
                <Text style={styles.selectedRouteFallback}>{t('homeSelectedRouteFallback')}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{t('homeNoHikesTitle')}</Text>
            <Text style={styles.emptyStateBody}>{t('homeNoHikesBody')}</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={styles.panelTitle}>{t('homeSavedHikesTitle')}</Text>
            <Text style={styles.panelSubtle}>
              {hikes.length === 0
                ? t('homeSavedHikesEmpty')
                : t('homeSavedHikesCount', {
                    count: hikes.length,
                    suffix: englishPluralSuffix(hikes.length),
                  })}
            </Text>
          </View>

          {isPending ? <Text style={styles.pendingText}>{t('commonRefreshing')}</Text> : null}
        </View>

        {hikes.map((hike) => {
          const isSelected = hike.id === selectedHikeId;
          const insights = hikeInsightsById[hike.id];

          return (
            <Pressable
              key={hike.id}
              accessibilityRole="button"
              onPress={() => setSelectedHikeId(hike.id)}
              style={({ pressed }) => [
                styles.hikeCard,
                isSelected && styles.hikeCardSelected,
                pressed && styles.hikeCardPressed,
              ]}
            >
              <View style={styles.hikeCardHeader}>
                <View style={styles.hikeCardTextGroup}>
                  <Text style={styles.hikeCardTitle}>{hike.title}</Text>
                  <Text style={styles.hikeCardMeta}>
                    {formatLocalizedDateTime(hike.startedAt)} | {getSourceTypeLabel(hike.sourceType, t)}
                  </Text>
                  {insights ? (
                    <View style={styles.hikeCardChips}>
                      <InfoChip
                        accent={isSelected}
                        label={getDifficultyLabel(insights.difficulty, t)}
                      />
                      <InfoChip label={getRouteTypeLabel(insights.routeType, t)} />
                    </View>
                  ) : null}
                </View>

                {isSelected ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>{t('commonSelected')}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.hikeCardStats}>
                <Text style={styles.hikeCardStat}>{formatDistance(hike.distanceMeters)}</Text>
                <Text style={styles.hikeCardStat}>{formatElevation(hike.elevationGainMeters)}</Text>
                <Text style={styles.hikeCardStat}>
                  {formatDuration(hike.durationSeconds, {
                    language,
                    unavailableLabel: t('commonNotAvailable'),
                  })}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 16,
  },
  leadSection: {
    backgroundColor: palette.panelRaised,
    borderColor: '#D3DEC8',
    borderRadius: 32,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  hero: {
    gap: 14,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  heroTextBlock: {
    gap: 16,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroBody: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  heroFootnote: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageOption: {
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageOptionActive: {
    backgroundColor: palette.accentStrong,
    borderColor: palette.accentStrong,
  },
  languageOptionPressed: {
    opacity: 0.86,
  },
  languageOptionText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  languageOptionTextActive: {
    color: '#F5FBF7',
  },
  heroSnapshot: {
    backgroundColor: 'rgba(246, 249, 241, 0.96)',
    borderColor: '#CFDBC7',
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    shadowColor: '#112118',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  heroSnapshotWide: {
    maxWidth: 360,
  },
  heroSnapshotCompact: {
    maxWidth: '100%',
  },
  heroSnapshotMobile: {
    borderRadius: 18,
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  heroSnapshotHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  heroSnapshotHeaderCompact: {
    alignItems: 'flex-start',
    gap: 4,
  },
  heroSnapshotTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
  },
  heroSnapshotTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  heroSnapshotMeta: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  heroSnapshotMetaCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  heroSnapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroSnapshotGridCompact: {
    gap: 8,
  },
  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  panelHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelHeaderCopy: {
    flex: 1,
  },
  panelTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700',
  },
  panelBody: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  panelSubtle: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.sand,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: palette.sandText,
    fontSize: 16,
    fontWeight: '700',
  },
  urlRow: {
    gap: 10,
  },
  urlInput: {
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accentStrong,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: '#F4FBF6',
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  topMenuSection: {
    gap: 12,
  },
  topMenuSectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  topMenuSectionBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  topMenuDivider: {
    backgroundColor: palette.border,
    height: 1,
  },
  mapHint: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: palette.error,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  successBanner: {
    backgroundColor: palette.success,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoBanner: {
    backgroundColor: palette.accentStrong,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bannerText: {
    color: '#F7FBF8',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  linkButton: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexGrow: 1,
    minWidth: '47%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricCardCompact: {
    borderRadius: 14,
    minWidth: '46%',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricCardEmphasis: {
    backgroundColor: palette.highlightSoft,
  },
  metricLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricLabelCompact: {
    fontSize: 9,
    lineHeight: 12,
  },
  metricValue: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  metricValueCompact: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 3,
  },
  metricValueEmphasis: {
    color: palette.highlightText,
  },
  selectedRouteFallback: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  infoChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EFE1',
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipAccent: {
    backgroundColor: palette.highlight,
    borderColor: palette.highlight,
  },
  infoChipText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  infoChipTextAccent: {
    color: palette.sandText,
  },
  mapLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapStage: {
    overflow: 'hidden',
    position: 'relative',
  },
  snapshotOverlay: {
    position: 'absolute',
  },
  snapshotOverlayWide: {
    left: 74,
    right: 236,
    top: 14,
  },
  snapshotOverlayCompact: {
    left: 14,
    right: 14,
    top: 74,
  },
  snapshotOverlayMobile: {
    left: 14,
    right: undefined,
    top: 86,
  },
  mapViewBadgeOverlay: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  mapViewBadge: {
    backgroundColor: 'rgba(31, 43, 34, 0.88)',
    borderRadius: 20,
    gap: 3,
    maxWidth: 260,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapViewBadgeLabel: {
    color: 'rgba(244, 250, 241, 0.82)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  mapViewBadgeValue: {
    color: '#F8FBF9',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  mapSupportRow: {
    gap: 14,
    paddingHorizontal: 4,
  },
  mapSupportCopy: {
    gap: 4,
  },
  mapSupportTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
  },
  featuredFallback: {
    backgroundColor: palette.inputBackground,
    borderColor: palette.highlight,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  emptyStateTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  pendingText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hikeCard: {
    backgroundColor: '#F8FBF5',
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  hikeCardSelected: {
    backgroundColor: '#FFF7EE',
    borderColor: palette.highlight,
  },
  hikeCardPressed: {
    opacity: 0.9,
  },
  hikeCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  hikeCardTextGroup: {
    flex: 1,
    gap: 4,
  },
  hikeCardTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  hikeCardMeta: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  hikeCardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  selectedBadge: {
    backgroundColor: palette.highlight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedBadgeText: {
    color: '#FFF9F2',
    fontSize: 12,
    fontWeight: '700',
  },
  hikeCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hikeCardStat: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
