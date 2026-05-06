import { StyleSheet, Text, View } from 'react-native';

import { RoutePreviewGraphic } from './RoutePreviewGraphic';
import { formatDistance, formatElevation } from '../lib/format';
import { getDifficultyLabel, getRouteTypeLabel, useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import type { HikeInsights, HikeRecord } from '../types/hikes';

function PosterStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function PosterHighlight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.highlight}>
      <Text style={styles.highlightLabel}>{label}</Text>
      <Text style={styles.highlightValue}>{value}</Text>
    </View>
  );
}

export function HikeSummaryPoster({
  hike,
  insights,
}: {
  hike: HikeRecord;
  insights: HikeInsights;
}) {
  const { t } = useI18n();
  const elevationRangeLabel =
    insights.elevationRangeMeters === null
      ? t('commonNotAvailable')
      : formatElevation(insights.elevationRangeMeters);
  const startToFinishGapLabel =
    insights.startToFinishGapMeters === null
      ? t('commonNotAvailable')
      : formatDistance(insights.startToFinishGapMeters);
  const steepestClimbLabel =
    insights.steepestClimbPercent === null
      ? t('commonNotAvailable')
      : `${insights.steepestClimbPercent.toFixed(1)}%`;
  const highestPointLabel =
    insights.highestElevationMeters === null
      ? t('commonNotAvailable')
      : formatElevation(insights.highestElevationMeters);

  return (
    <View style={styles.poster}>
      <View style={styles.topRow}>
        <View style={styles.brandChip}>
          <Text style={styles.brandChipText}>{t('appName')}</Text>
        </View>
        <View style={styles.routeChip}>
          <Text style={styles.routeChipText}>{getRouteTypeLabel(insights.routeType, t)}</Text>
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{hike.title}</Text>
          <Text style={styles.subtitle}>{getDifficultyLabel(insights.difficulty, t)}</Text>
        </View>
      </View>

      <View style={styles.highlightRow}>
        <PosterHighlight label={t('factDistance')} value={formatDistance(hike.distanceMeters)} />
        <PosterHighlight label={t('factHighestPoint')} value={highestPointLabel} />
        <PosterHighlight label={t('factAscent')} value={formatElevation(hike.elevationGainMeters)} />
      </View>

      <View style={styles.previewFrame}>
        <RoutePreviewGraphic height={220} points={hike.points} />
      </View>

      <View style={styles.grid}>
        <PosterStat label={t('factRouteType')} value={getRouteTypeLabel(insights.routeType, t)} />
        <PosterStat label={t('factDifficulty')} value={getDifficultyLabel(insights.difficulty, t)} />
        <PosterStat label={t('factElevationRange')} value={elevationRangeLabel} />
        <PosterStat label={t('factDescent')} value={formatElevation(insights.elevationLossMeters)} />
        <PosterStat label={t('factHighestPoint')} value={highestPointLabel} />
        <PosterStat label={t('factStartFinishGap')} value={startToFinishGapLabel} />
        <PosterStat label={t('factSteepestClimb')} value={steepestClimbLabel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    backgroundColor: '#F2F7EC',
    borderColor: '#D1DDC5',
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 22,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandChip: {
    backgroundColor: '#E4EFE9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandChipText: {
    color: palette.accentStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  routeChip: {
    backgroundColor: '#DDE9D8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  routeChipText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  header: {
    gap: 10,
  },
  headerText: {
    gap: 6,
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexGrow: 1,
    minWidth: '30%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  highlightLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  highlightValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 4,
  },
  previewFrame: {
    backgroundColor: '#E6EEDF',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minWidth: '31%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
});
