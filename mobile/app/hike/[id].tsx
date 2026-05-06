import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AppTopBar } from '../../src/components/AppTopBar';
import { ElevationProfileChart } from '../../src/components/ElevationProfileChart';
import { HikeMap } from '../../src/components/HikeMap';
import { HikeSummaryPoster } from '../../src/components/HikeSummaryPoster';
import { RouteDynamicsChart } from '../../src/components/RouteDynamicsChart';
import { formatDateTime, formatDistance, formatDuration, formatElevation } from '../../src/lib/format';
import {
  getDifficultyLabel,
  getLanguageDisplayLabel,
  getRouteDynamicsLabel,
  getRouteTypeLabel,
  getSourceTypeLabel,
  useI18n,
} from '../../src/lib/i18n';
import { getHikeInsights } from '../../src/lib/hike-insights';
import { getHikeById, initializeHikeStore } from '../../src/lib/hikes-store';
import { palette } from '../../src/lib/theme';
import type { AppLanguage, DifficultyLevel, ElevationProfilePoint, HikeInsights, HikeRecord } from '../../src/types/hikes';

type ActionTone = 'primary' | 'secondary' | 'ghost';

function readHikeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function createPosterFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'hike'}-summary.png`;
}

function getDifficultyColors(level: DifficultyLevel) {
  if (level === 'Easy') {
    return {
      backgroundColor: '#E0EEE6',
      textColor: '#2A5B45',
    };
  }

  if (level === 'Moderate') {
    return {
      backgroundColor: '#F3E0C4',
      textColor: '#935E25',
    };
  }

  return {
    backgroundColor: '#E8D4CC',
    textColor: '#93492E',
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function FactCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.factCard}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function HeroMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroMetricCard}>
      <Text style={styles.heroMetricLabel}>{label}</Text>
      <Text style={styles.heroMetricValue}>{value}</Text>
    </View>
  );
}

function InlineFactPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.inlineFactPill}>
      <Text style={styles.inlineFactLabel}>{label}</Text>
      <Text style={styles.inlineFactValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone = 'secondary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: ActionTone;
  disabled?: boolean;
}) {
  const isPrimary = tone === 'primary';
  const isSecondary = tone === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isPrimary && styles.actionButtonPrimary,
        isSecondary && styles.actionButtonSecondary,
        tone === 'ghost' && styles.actionButtonGhost,
        (pressed || disabled) && styles.actionButtonPressed,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          isPrimary && styles.actionButtonTextPrimary,
          isSecondary && styles.actionButtonTextSecondary,
          tone === 'ghost' && styles.actionButtonTextGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function HikeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const hikeId = readHikeId(params.id);
  const posterRef = useRef<View | null>(null);
  const { language, locale, setLanguage, t } = useI18n();
  const [hike, setHike] = useState<HikeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSavingPoster, setIsSavingPoster] = useState(false);
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [activeProfilePoint, setActiveProfilePoint] = useState<ElevationProfilePoint | null>(null);
  const [isElevationExpanded, setIsElevationExpanded] = useState(false);

  const readErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  };

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        await initializeHikeStore();

        if (!hikeId) {
          throw new Error(t('detailNoId'));
        }

        const nextHike = await getHikeById(hikeId);

        if (!nextHike) {
          throw new Error(t('detailMissing'));
        }

        if (isActive) {
          setHike(nextHike);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(readErrorMessage(error, t('detailLoadError')));
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
  }, [hikeId, t]);

  useEffect(() => {
    setActiveProfilePoint(null);
    setIsElevationExpanded(false);
  }, [hikeId]);

  const insights = useMemo(() => (hike ? getHikeInsights(hike) : null), [hike]);

  const difficultyColors = useMemo(
    () => (insights ? getDifficultyColors(insights.difficulty) : null),
    [insights]
  );

  const formatLocalizedDateTime = (value: string | null) =>
    formatDateTime(value, {
      locale,
      unavailableLabel: t('commonNotAvailable'),
    });

  const buildOverview = (currentHike: HikeRecord, currentInsights: HikeInsights) => {
    const durationPart =
      currentHike.durationSeconds === null
        ? ''
        : t('detailOverviewDurationPart', {
            duration: formatDuration(currentHike.durationSeconds, {
              language,
              unavailableLabel: t('commonNotAvailable'),
            }),
          });

    return t('detailOverview', {
      difficulty: getDifficultyLabel(currentInsights.difficulty, t),
      routeType: getRouteTypeLabel(currentInsights.routeType, t),
      distance: formatDistance(currentHike.distanceMeters),
      ascent: formatElevation(currentHike.elevationGainMeters),
      durationPart,
    });
  };

  const formatOptionalElevation = (value: number | null) => {
    if (value === null) {
      return t('commonNotAvailable');
    }

    return formatElevation(value);
  };

  const formatOptionalDistance = (value: number | null) => {
    if (value === null) {
      return t('commonNotAvailable');
    }

    return formatDistance(value);
  };

  const formatGradePercent = (value: number | null) => {
    if (value === null) {
      return t('commonNotAvailable');
    }

    return `${Math.abs(value).toFixed(1)}%`;
  };

  const formatMetersPerKilometer = (value: number | null) => {
    if (value === null) {
      return t('commonNotAvailable');
    }

    return `${Math.round(value)} m/km`;
  };

  const formatDominantTerrain = (currentInsights: HikeInsights) => {
    if (currentInsights.dominantRouteDynamicsKey === null) {
      return t('commonNotAvailable');
    }

    return getRouteDynamicsLabel(currentInsights.dominantRouteDynamicsKey, t);
  };

  const handleActiveProfilePointChange = (point: ElevationProfilePoint | null) => {
    setActiveProfilePoint((current) => {
      if (current?.sourcePointIndex === point?.sourcePointIndex) {
        return current;
      }

      return point;
    });
  };

  const capturePosterOnNative = async () => {
    if (!posterRef.current) {
      throw new Error('The summary poster is not ready yet.');
    }

    return captureRef(posterRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  };

  const downloadPosterOnWeb = async (title: string) => {
    if (typeof document === 'undefined') {
      throw new Error('The browser environment is not available.');
    }

    const target = document.getElementById('hike-summary-poster');

    if (!target) {
      throw new Error('The summary poster is not ready yet.');
    }

    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(target, {
      backgroundColor: '#F2F7EC',
      cacheBust: true,
      pixelRatio: 2,
    });

    const link = document.createElement('a');
    link.download = createPosterFileName(title);
    link.href = dataUrl;
    link.click();
  };

  const handleSavePoster = async () => {
    if (!hike || !insights) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSavingPoster(true);

    try {
      if (Platform.OS === 'web') {
        await downloadPosterOnWeb(hike.title);
        setStatusMessage(t('detailDownloadedImage'));
        return;
      }

      const imageUri = await capturePosterOnNative();
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(imageUri);
          setStatusMessage(t('detailSavedViaShareSheet'));
          return;
        }

        throw new Error(t('detailPermissionRequired'));
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
      setStatusMessage(t('detailSavedImage'));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t('detailLoadError')));
    } finally {
      setIsSavingPoster(false);
    }
  };

  const handleSharePoster = async () => {
    if (!hike || Platform.OS === 'web') {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSharingPoster(true);

    try {
      const imageUri = await capturePosterOnNative();

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(t('detailSharingUnavailable'));
      }

      await Sharing.shareAsync(imageUri);
      setStatusMessage(t('detailShareSheetOpened'));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t('detailLoadError')));
    } finally {
      setIsSharingPoster(false);
    }
  };

  const handleOpenSource = async () => {
    if (!hike || hike.sourceType !== 'url') {
      return;
    }

    setErrorMessage(null);

    try {
      await Linking.openURL(hike.sourceValue);
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t('detailLoadError')));
    }
  };

  const changeLanguage = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === language) {
      return;
    }

    await setLanguage(nextLanguage);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: hike?.title ?? t('detailTitle'),
        }}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.accentStrong} />
          </View>
        ) : errorMessage && !hike ? (
          <View style={styles.bannerError}>
            <Text style={styles.bannerText}>{errorMessage}</Text>
          </View>
        ) : hike && insights && difficultyColors ? (
          <>
            <AppTopBar
              canGoBack
              menuContent={
                <View style={styles.topMenuSection}>
                  <Text style={styles.topMenuSectionTitle}>{t('navLanguageSection')}</Text>
                  <View style={styles.topMenuLanguageOptions}>
                    {(['en', 'hu'] as AppLanguage[]).map((option) => (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        onPress={() => {
                          void changeLanguage(option);
                        }}
                        style={({ pressed }) => [
                          styles.topMenuLanguageOption,
                          language === option && styles.topMenuLanguageOptionActive,
                          pressed && styles.actionButtonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.topMenuLanguageOptionText,
                            language === option && styles.topMenuLanguageOptionTextActive,
                          ]}
                        >
                          {getLanguageDisplayLabel(option)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              }
              onBackPress={() => router.back()}
              title={t('detailTitle')}
            />

            <View style={styles.hero}>
              <View style={styles.heroTagRow}>
                <View style={styles.heroTag}>
                  <Text style={styles.heroTagText}>{getSourceTypeLabel(hike.sourceType, t)}</Text>
                </View>
                <View style={[styles.heroTag, styles.heroTagWarm]}>
                  <Text style={styles.heroTagWarmText}>{getRouteTypeLabel(insights.routeType, t)}</Text>
                </View>
                <View
                  style={[
                    styles.heroTag,
                    { backgroundColor: difficultyColors.backgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroTagText,
                      { color: difficultyColors.textColor },
                    ]}
                  >
                    {getDifficultyLabel(insights.difficulty, t)}
                  </Text>
                </View>
              </View>

              <View style={styles.heroHeader}>
                <View style={styles.heroTextGroup}>
                  <Text style={styles.title}>{hike.title}</Text>
                  <Text style={styles.subtitle}>{buildOverview(hike, insights)}</Text>
                  <Text style={styles.heroMetaInline}>
                    {t('detailRecordedImported', {
                      recorded: formatLocalizedDateTime(hike.startedAt),
                      imported: formatLocalizedDateTime(hike.createdAt),
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.heroMetrics}>
                <HeroMetricCard label={t('factDistance')} value={formatDistance(hike.distanceMeters)} />
                <HeroMetricCard
                  label={t('factAscent')}
                  value={formatElevation(hike.elevationGainMeters)}
                />
                <HeroMetricCard
                  label={t('factElevationRange')}
                  value={formatOptionalElevation(insights.elevationRangeMeters)}
                />
              </View>

              <View style={styles.heroSignatureRow}>
                <InlineFactPill
                  label={t('factDuration')}
                  value={formatDuration(hike.durationSeconds, {
                    language,
                    unavailableLabel: t('commonNotAvailable'),
                  })}
                />
                <InlineFactPill
                  label={t('factHighestPoint')}
                  value={formatOptionalElevation(insights.highestElevationMeters)}
                />
                <InlineFactPill
                  label={t('factLowestPoint')}
                  value={formatOptionalElevation(insights.lowestElevationMeters)}
                />
                <InlineFactPill
                  label={t('factDominantTerrain')}
                  value={formatDominantTerrain(insights)}
                />
              </View>

              <View style={styles.analysisPanel}>
                <View style={styles.mapScene}>
                  <View style={styles.mapFrame}>
                    <HikeMap
                      focusedProfilePoint={activeProfilePoint}
                      height={480}
                      hikes={[hike]}
                      onFocusedProfilePointChange={handleActiveProfilePointChange}
                      profilePoints={insights.elevationProfile}
                      selectedHikeId={hike.id}
                      showMarkers
                    />

                    <View pointerEvents="box-none" style={styles.mapTopControls}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setIsElevationExpanded((current) => !current)}
                        style={({ pressed }) => [
                          styles.profileMapToggle,
                          isElevationExpanded && styles.profileMapToggleActive,
                          pressed && styles.actionButtonPressed,
                        ]}
                      >
                        <View style={styles.profileMapToggleCopy}>
                          <Text style={styles.profileMapToggleTitle}>
                            {t('detailElevationTitle')}
                          </Text>
                          <Text style={styles.profileMapToggleHint}>
                            {isElevationExpanded
                              ? t('detailProfileDrawerClose')
                              : t('detailProfileDrawerOpen')}
                          </Text>
                        </View>
                        <Text style={styles.profileMapToggleIcon}>
                          {isElevationExpanded ? '−' : '+'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {isElevationExpanded ? (
                    <View style={styles.profileDrawerContent}>
                      <Text style={styles.profileDrawerInlineHint}>
                        {t('detailProfileDrawerHint')}
                      </Text>
                      <ElevationProfileChart
                        activePoint={activeProfilePoint}
                        height={340}
                        onActivePointChange={handleActiveProfilePointChange}
                        points={insights.elevationProfile}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.dynamicsPanel}>
                  <View style={styles.dynamicsHeader}>
                    <Text style={styles.dynamicsTitle}>{t('detailDynamicsTitle')}</Text>
                    <Text style={styles.dynamicsDescription}>{t('detailDynamicsDescription')}</Text>
                  </View>
                  <RouteDynamicsChart items={insights.routeDynamics} />
                </View>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.bannerError}>
                <Text style={styles.bannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {statusMessage ? (
              <View style={styles.bannerSuccess}>
                <Text style={styles.bannerText}>{statusMessage}</Text>
              </View>
            ) : null}

            <Section description={t('detailSignatureDescription')} title={t('detailSignatureTitle')}>
              <View style={styles.factGrid}>
                <FactCard label={t('factDescent')} value={formatElevation(insights.elevationLossMeters)} />
                <FactCard
                  label={t('factLowestPoint')}
                  value={formatOptionalElevation(insights.lowestElevationMeters)}
                />
                <FactCard
                  label={t('factStartFinishGap')}
                  value={formatOptionalDistance(insights.startToFinishGapMeters)}
                />
                <FactCard
                  label={t('factClimbPerKilometer')}
                  value={formatMetersPerKilometer(insights.climbPerKilometerMeters)}
                />
                <FactCard
                  label={t('factSteepestClimb')}
                  value={formatGradePercent(insights.steepestClimbPercent)}
                />
                <FactCard
                  label={t('factSteepestDescent')}
                  value={formatGradePercent(insights.steepestDescentPercent)}
                />
                <FactCard
                  label={t('factDominantTerrain')}
                  value={formatDominantTerrain(insights)}
                />
              </View>
            </Section>

            <Section description={t('detailPosterDescription')} title={t('detailPosterTitle')}>
              <View style={styles.exportPanel}>
                <View
                  collapsable={false}
                  nativeID="hike-summary-poster"
                  ref={posterRef}
                  style={styles.posterFrame}
                >
                  <HikeSummaryPoster hike={hike} insights={insights} />
                </View>

                <View style={styles.exportHeader}>
                  <Text style={styles.exportEyebrow}>{t('detailPosterActionTitle')}</Text>
                  <Text style={styles.exportLead}>{t('detailPosterActionBody')}</Text>
                  <Text style={styles.exportNote}>
                    {Platform.OS === 'web'
                      ? t('detailPosterActionWebHint')
                      : t('detailPosterActionNativeHint')}
                  </Text>
                </View>

                <View style={styles.exportHighlights}>
                  <InlineFactPill label={t('factDistance')} value={formatDistance(hike.distanceMeters)} />
                  <InlineFactPill
                    label={t('factHighestPoint')}
                    value={formatOptionalElevation(insights.highestElevationMeters)}
                  />
                  <InlineFactPill label={t('factAscent')} value={formatElevation(hike.elevationGainMeters)} />
                </View>

                <View style={styles.actionRow}>
                  {Platform.OS !== 'web' ? (
                    <ActionButton
                      disabled={isSavingPoster || isSharingPoster}
                      label={isSharingPoster ? t('detailSharingImage') : t('detailShareImage')}
                      onPress={() => {
                        void handleSharePoster();
                      }}
                      tone="primary"
                    />
                  ) : null}
                  <ActionButton
                    disabled={isSavingPoster || isSharingPoster}
                    label={isSavingPoster ? t('detailSavingImage') : t('detailSaveImage')}
                    onPress={() => {
                      void handleSavePoster();
                    }}
                    tone={Platform.OS === 'web' ? 'primary' : 'secondary'}
                  />
                </View>
              </View>
            </Section>

            <View style={styles.sourceFooter}>
              <Text style={styles.sourceLabel}>{t('detailSourceTitle')}</Text>
              <Text selectable style={styles.sourceValue}>
                {hike.sourceValue}
              </Text>
              {hike.sourceType === 'url' ? (
                <View style={styles.sourceActionRow}>
                  <ActionButton
                    disabled={isSavingPoster || isSharingPoster}
                    label={t('detailOpenSource')}
                    onPress={() => {
                      void handleOpenSource();
                    }}
                    tone="ghost"
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 44,
  },
  topMenuSection: {
    gap: 12,
  },
  topMenuSectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  topMenuLanguageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topMenuLanguageOption: {
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topMenuLanguageOptionActive: {
    backgroundColor: palette.accentStrong,
    borderColor: palette.accentStrong,
  },
  topMenuLanguageOptionText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  topMenuLanguageOptionTextActive: {
    color: '#F4FAF1',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  hero: {
    backgroundColor: palette.panelRaised,
    borderColor: '#D4DEC9',
    borderRadius: 30,
    borderWidth: 1,
    gap: 18,
    padding: 24,
  },
  heroTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroTag: {
    backgroundColor: '#E6EFEA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroTagWarm: {
    backgroundColor: '#DCE8D7',
  },
  heroTagText: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTagWarmText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroHeader: {
    gap: 12,
  },
  heroTextGroup: {
    gap: 8,
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  heroMetaInline: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroMetricCard: {
    backgroundColor: '#F8FBF5',
    borderColor: '#D4DEC9',
    borderRadius: 22,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '30%',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  heroMetricLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroMetricValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 6,
  },
  heroSignatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inlineFactPill: {
    backgroundColor: '#E7EFE0',
    borderRadius: 18,
    gap: 4,
    minWidth: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineFactLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inlineFactValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexGrow: 1,
    minHeight: 48,
    justifyContent: 'center',
    minWidth: 156,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonPrimary: {
    backgroundColor: palette.sand,
  },
  actionButtonSecondary: {
    backgroundColor: palette.accentStrong,
  },
  actionButtonGhost: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
  },
  actionButtonPressed: {
    opacity: 0.86,
  },
  actionButtonDisabled: {
    opacity: 0.72,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: palette.sandText,
  },
  actionButtonTextSecondary: {
    color: '#F4FBF6',
  },
  actionButtonTextGhost: {
    color: palette.text,
  },
  bannerError: {
    backgroundColor: palette.error,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  bannerSuccess: {
    backgroundColor: palette.success,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  bannerText: {
    color: '#F9FBF9',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  section: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  sectionHeader: {
    gap: 8,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sectionDescription: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  mapFrame: {
    borderColor: '#D4DEC9',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapScene: {
    gap: 12,
  },
  mapTopControls: {
    alignItems: 'flex-end',
    left: 12,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  analysisPanel: {
    backgroundColor: '#EEF4E7',
    borderColor: '#D4DEC9',
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  profileMapToggle: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(247, 251, 244, 0.94)',
    borderColor: 'rgba(212, 222, 201, 0.96)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    maxWidth: 320,
    minWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  profileMapToggleActive: {
    backgroundColor: 'rgba(232, 241, 228, 0.97)',
  },
  profileMapToggleCopy: {
    flex: 1,
    gap: 2,
  },
  profileMapToggleTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  profileMapToggleHint: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  profileMapToggleIcon: {
    color: palette.accentStrong,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 28,
    textAlign: 'right',
  },
  profileDrawerContent: {
    backgroundColor: '#F7FBF4',
    borderColor: '#D4DEC9',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileDrawerInlineHint: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  dynamicsPanel: {
    backgroundColor: '#F7FBF4',
    borderColor: '#D4DEC9',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  dynamicsHeader: {
    gap: 6,
  },
  dynamicsTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  dynamicsDescription: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  factCard: {
    backgroundColor: '#F8FBF5',
    borderRadius: 20,
    flexGrow: 1,
    minWidth: '46%',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  factLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  factValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
  },
  exportPanel: {
    backgroundColor: palette.panelRaised,
    borderColor: '#D4DEC9',
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  exportHeader: {
    gap: 8,
  },
  exportEyebrow: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  exportLead: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  exportNote: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  exportHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  posterFrame: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  sourceActionRow: {
    paddingTop: 4,
  },
  sourceFooter: {
    backgroundColor: '#E7EFE0',
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  sourceLabel: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  sourceValue: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
