import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatDistance, formatDurationWithEstimate, formatElevation } from '../lib/format';
import { getDifficultyLabel, getRouteTypeLabel, useI18n } from '../lib/i18n';
import { getHikeInsights } from '../lib/hike-insights';
import { palette } from '../lib/theme';
import type { HikeRecord } from '../types/hikes';

function PreviewStat({
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

export function HikeRoutePreviewCard({
  hike,
}: {
  hike: HikeRecord;
}) {
  const { language, t } = useI18n();
  const insights = useMemo(() => getHikeInsights(hike), [hike]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{getDifficultyLabel(insights.difficulty, t)}</Text>
        </View>
        <View style={[styles.chip, styles.chipWarm]}>
          <Text style={[styles.chipText, styles.chipTextWarm]}>
            {getRouteTypeLabel(insights.routeType, t)}
          </Text>
        </View>
      </View>

      <Text numberOfLines={2} style={styles.title}>
        {hike.title}
      </Text>

      <View style={styles.grid}>
        <PreviewStat label={t('factDistance')} value={formatDistance(hike.distanceMeters)} />
        <PreviewStat label={t('factAscent')} value={formatElevation(hike.elevationGainMeters)} />
        <PreviewStat label={t('factDescent')} value={formatElevation(insights.elevationLossMeters)} />
        <PreviewStat
          label={t('factDuration')}
          value={formatDurationWithEstimate(hike.durationSeconds, {
            distanceMeters: hike.distanceMeters,
            elevationGainMeters: hike.elevationGainMeters,
            language,
            unavailableLabel: t('commonNotAvailable'),
          })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    maxWidth: 320,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipWarm: {
    backgroundColor: palette.highlightSoft,
    borderColor: palette.highlight,
  },
  chipText: {
    color: palette.accentStrong,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chipTextWarm: {
    color: palette.highlightText,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    backgroundColor: palette.panelRaised,
    borderRadius: 16,
    flexGrow: 1,
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    color: palette.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 4,
  },
});
