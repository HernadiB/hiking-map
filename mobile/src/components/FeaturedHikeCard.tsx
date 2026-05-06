import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RoutePreviewGraphic } from './RoutePreviewGraphic';
import { formatDateTime, formatDistance, formatDuration, formatElevation } from '../lib/format';
import {
  getDifficultyLabel,
  getRouteTypeLabel,
  getSourceTypeLabel,
  useI18n,
} from '../lib/i18n';
import { palette } from '../lib/theme';
import type { HikeInsights, HikeRecord } from '../types/hikes';

function FeaturedStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function FeaturedHikeCard({
  hike,
  insights,
  label,
  actionLabel,
  onActionPress,
}: {
  hike: HikeRecord;
  insights: HikeInsights;
  label: string;
  actionLabel?: string;
  onActionPress?: (() => void) | undefined;
}) {
  const { language, locale, t } = useI18n();
  const recordedAtLabel = formatDateTime(hike.startedAt, {
    locale,
    unavailableLabel: t('commonNotAvailable'),
  });
  const elevationRangeLabel =
    insights.elevationRangeMeters === null
      ? t('commonNotAvailable')
      : formatElevation(insights.elevationRangeMeters);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{label}</Text>
          <Text style={styles.title}>{hike.title}</Text>
          <Text style={styles.meta}>
            {recordedAtLabel} | {getSourceTypeLabel(hike.sourceType, t)}
          </Text>
        </View>

        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{getDifficultyLabel(insights.difficulty, t)}</Text>
        </View>
        <View style={[styles.chip, styles.chipWarm]}>
          <Text style={[styles.chipText, styles.chipWarmText]}>
            {getRouteTypeLabel(insights.routeType, t)}
          </Text>
        </View>
      </View>

      <View style={styles.previewFrame}>
        <RoutePreviewGraphic height={176} points={hike.points} />
      </View>

      <View style={styles.statGrid}>
        <FeaturedStat label={t('factDistance')} value={formatDistance(hike.distanceMeters)} />
        <FeaturedStat label={t('factAscent')} value={formatElevation(hike.elevationGainMeters)} />
        <FeaturedStat label={t('factElevationRange')} value={elevationRangeLabel} />
        <FeaturedStat
          label={t('factDuration')}
          value={formatDuration(hike.durationSeconds, {
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
    backgroundColor: '#F6F9F1',
    borderColor: '#CFDBC7',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: palette.accentStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  meta: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: palette.accentStrong,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: '#F4FAF1',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#E5EFE9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipWarm: {
    backgroundColor: '#DDE9D8',
  },
  chipText: {
    color: palette.accentStrong,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chipWarmText: {
    color: palette.accent,
  },
  previewFrame: {
    backgroundColor: '#E6EEDF',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 10,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexGrow: 1,
    minWidth: '46%',
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
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 4,
  },
});
