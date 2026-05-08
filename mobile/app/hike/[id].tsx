import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  type DimensionValue,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AppTopBar } from '../../src/components/AppTopBar';
import { ElevationProfileChart } from '../../src/components/ElevationProfileChart';
import { HikeMap } from '../../src/components/HikeMap';
import { HikeSummaryPoster } from '../../src/components/HikeSummaryPoster';
import { TrailScenePreview } from '../../src/components/TrailScenePreview';
import {
  formatDateTime,
  formatDistance,
  formatDurationWithEstimate,
  formatElevation,
} from '../../src/lib/format';
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
import { useAppTheme } from '../../src/lib/theme-context';
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
      backgroundColor: palette.inputBackground,
      textColor: palette.accentStrong,
    };
  }

  if (level === 'Moderate') {
    return {
      backgroundColor: palette.highlightSoft,
      textColor: palette.highlightText,
    };
  }

  return {
    backgroundColor: palette.highlightSoft,
    textColor: palette.error,
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
  style,
  value,
}: {
  label: string;
  style?: ViewStyle;
  value: string;
}) {
  return (
    <View style={[styles.factCard, style]}>
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
  const { width } = useWindowDimensions();
  const { language, locale, setLanguage, t } = useI18n();
  const { colors } = useAppTheme();
  const [hike, setHike] = useState<HikeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSavingPoster, setIsSavingPoster] = useState(false);
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [activeProfilePoint, setActiveProfilePoint] = useState<ElevationProfilePoint | null>(null);
  const [isElevationExpanded, setIsElevationExpanded] = useState(false);
  const [isPosterExpanded, setIsPosterExpanded] = useState(false);
  const showLegacyMapAndProfile = false;

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
    setIsPosterExpanded(false);
  }, [hikeId]);

  const insights = useMemo(() => (hike ? getHikeInsights(hike) : null), [hike]);

  const difficultyColors = useMemo(
    () => (insights ? getDifficultyColors(insights.difficulty) : null),
    [insights]
  );
  const signatureColumnCount = width >= 1120 ? 3 : width >= 720 ? 2 : 1;
  const signatureCardBasis: DimensionValue =
    signatureColumnCount === 1
      ? '100%'
      : `${(100 - (signatureColumnCount - 1) * 1.8) / signatureColumnCount}%`;
  const formatLocalizedDateTime = (value: string | null) =>
    formatDateTime(value, {
      locale,
      unavailableLabel: t('commonNotAvailable'),
    });

  const formatRecordedImportedLabel = (currentHike: HikeRecord) => {
    const importedLabel = formatLocalizedDateTime(currentHike.createdAt);

    if (!currentHike.startedAt) {
      return t('detailImportedOnly', {
        imported: importedLabel,
      });
    }

    return t('detailRecordedImported', {
      recorded: formatLocalizedDateTime(currentHike.startedAt),
      imported: importedLabel,
    });
  };

  const buildOverview = (currentHike: HikeRecord, currentInsights: HikeInsights) => {
    const durationPart = t('detailOverviewDurationPart', {
      duration: formatDurationWithEstimate(currentHike.durationSeconds, {
        distanceMeters: currentHike.distanceMeters,
        elevationGainMeters: currentHike.elevationGainMeters,
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
      backgroundColor: colors.panelRaised,
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

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, width < 680 && styles.contentCompact]}
      >
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
                  <Text style={styles.heroMetaInline}>{formatRecordedImportedLabel(hike)}</Text>
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
                  value={formatDurationWithEstimate(hike.durationSeconds, {
                    distanceMeters: hike.distanceMeters,
                    elevationGainMeters: hike.elevationGainMeters,
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

              {showLegacyMapAndProfile ? (
              <View style={styles.analysisPanel}>
                <View style={styles.routeExplorer}>
                  <View style={styles.mapFrame}>
                    <HikeMap
                      focusedProfilePoint={activeProfilePoint}
                      height={width < 680 ? 360 : 500}
                      hikes={[hike]}
                      onFocusedProfilePointChange={handleActiveProfilePointChange}
                      profilePoints={insights.elevationProfile}
                      selectedHikeId={hike.id}
                      showMarkers
                    />
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsElevationExpanded((current) => !current)}
                    style={({ pressed }) => [
                      styles.routeExplorerHandle,
                      pressed && styles.actionButtonPressed,
                    ]}
                  >
                    <Text style={styles.routeExplorerHandleIcon}>
                      {isElevationExpanded ? '-' : '+'}
                    </Text>
                  </Pressable>

                  <View style={styles.profileInstructionCard}>
                    <Text style={styles.profileInstructionText}>{t('detailProfileDrawerHint')}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsElevationExpanded((current) => !current)}
                      style={({ pressed }) => [
                        styles.profileMapToggle,
                        pressed && styles.actionButtonPressed,
                      ]}
                    >
                      <Text style={styles.profileMapToggleTitle}>
                        {isElevationExpanded
                          ? t('detailProfileDrawerClose')
                          : t('detailProfileDrawerOpen')}
                      </Text>
                      <Text style={styles.profileMapToggleIcon}>
                        {isElevationExpanded ? '-' : '+'}
                      </Text>
                    </Pressable>
                  </View>

                  {isElevationExpanded ? (
                    <View style={styles.profileDrawerContent}>
                      <ElevationProfileChart
                        activePoint={activeProfilePoint}
                        height={width < 680 ? 300 : 360}
                        onActivePointChange={handleActiveProfilePointChange}
                        points={insights.elevationProfile}
                        routeDynamicsItems={insights.routeDynamics}
                      />
                    </View>
                  ) : null}

                </View>

              </View>
              ) : null}
            </View>

            <TrailScenePreview
              ascentMeters={hike.elevationGainMeters}
              difficulty={insights.difficulty}
              distanceMeters={hike.distanceMeters}
              durationSeconds={hike.durationSeconds}
              elevationProfile={insights.elevationProfile}
              routeType={insights.routeType}
            />

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

            <View style={styles.signatureSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('detailSignatureTitle')}</Text>
                <Text style={styles.sectionDescription}>{t('detailSignatureDescription')}</Text>
              </View>
              <View style={styles.signatureGrid}>
                <FactCard
                  label={t('factDominantTerrain')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatDominantTerrain(insights)}
                />
                <FactCard
                  label={t('factDescent')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatElevation(insights.elevationLossMeters)}
                />
                <FactCard
                  label={t('factLowestPoint')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatOptionalElevation(insights.lowestElevationMeters)}
                />
                <FactCard
                  label={t('factStartFinishGap')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatOptionalDistance(insights.startToFinishGapMeters)}
                />
                <FactCard
                  label={t('factClimbPerKilometer')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatMetersPerKilometer(insights.climbPerKilometerMeters)}
                />
                <FactCard
                  label={t('factSteepestClimb')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatGradePercent(insights.steepestClimbPercent)}
                />
                <FactCard
                  label={t('factSteepestDescent')}
                  style={{ flexBasis: signatureCardBasis }}
                  value={formatGradePercent(insights.steepestDescentPercent)}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isPosterExpanded }}
                onPress={() => setIsPosterExpanded((value) => !value)}
                style={({ pressed }) => [
                  styles.posterCollapseHeader,
                  pressed && styles.posterCollapseHeaderPressed,
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('detailPosterTitle')}</Text>
                  <Text style={styles.sectionDescription}>{t('detailPosterDescription')}</Text>
                </View>
                <Text style={styles.posterCollapseIcon}>{isPosterExpanded ? '-' : '+'}</Text>
              </Pressable>

              {isPosterExpanded ? (
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
                      label={t('factDuration')}
                      value={formatDurationWithEstimate(hike.durationSeconds, {
                        distanceMeters: hike.distanceMeters,
                        elevationGainMeters: hike.elevationGainMeters,
                        language,
                        unavailableLabel: t('commonNotAvailable'),
                      })}
                    />
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
              ) : null}
            </View>

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
  contentCompact: {
    paddingHorizontal: 10,
    paddingTop: 10,
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
    color: palette.sandText,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  hero: {
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
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
    backgroundColor: palette.inputBackground,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroTagWarm: {
    backgroundColor: palette.highlightSoft,
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
    flexShrink: 1,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: palette.textMuted,
    flexShrink: 1,
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
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 160,
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
    backgroundColor: palette.inputBackground,
    borderRadius: 18,
    gap: 4,
    flexGrow: 1,
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
    minWidth: 0,
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
    color: palette.sandText,
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
    color: palette.sandText,
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
    borderColor: palette.border,
    borderRadius: 22,
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
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 10,
  },
  routeExplorer: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
  },
  profileInstructionCard: {
    alignItems: 'center',
    backgroundColor: palette.panel,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileInstructionText: {
    color: palette.textMuted,
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 20,
    minWidth: 220,
  },
  routeExplorerHandle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#394139',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    marginBottom: -17,
    marginTop: -17,
    shadowColor: '#1F2B20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 74,
    zIndex: 2,
  },
  routeExplorerHandleIcon: {
    color: palette.sandText,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 28,
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
    maxWidth: '100%',
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: palette.panel,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    padding: 12,
  },
  profileDrawerInlineHint: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  dynamicsPanel: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
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
  signatureSection: {
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: 16,
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#A85C1F',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  signatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  factCard: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 20,
    flexGrow: 1,
    minWidth: 0,
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
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  posterCollapseHeader: {
    alignItems: 'flex-start',
    borderRadius: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
    marginHorizontal: -6,
    marginTop: -6,
    padding: 6,
  },
  posterCollapseHeaderPressed: {
    backgroundColor: 'rgba(47, 77, 58, 0.06)',
    transform: [{ scale: 0.995 }],
  },
  posterCollapseIcon: {
    color: palette.accentStrong,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
    minWidth: 26,
    textAlign: 'center',
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
    flexShrink: 1,
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
    backgroundColor: palette.inputBackground,
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
    flexShrink: 1,
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
