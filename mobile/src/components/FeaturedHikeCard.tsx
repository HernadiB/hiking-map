import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RoutePreviewGraphic } from './RoutePreviewGraphic';
import { formatDistance, formatDurationWithEstimate, formatElevation } from '../lib/format';
import {
  getDifficultyLabel,
  getRouteTypeLabel,
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
  const { language, t } = useI18n();
  const elevationRangeLabel =
    insights.elevationRangeMeters === null
      ? t('commonNotAvailable')
      : formatElevation(insights.elevationRangeMeters);

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.cardGlow} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrow}>{label}</Text>
          </View>
          <Text style={styles.title}>{hike.title}</Text>
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
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>{t('detailSignatureTitle')}</Text>
        </View>
        <RoutePreviewGraphic height={236} points={hike.points} />
      </View>

      <View style={styles.statGrid}>
        <FeaturedStat label={t('factDistance')} value={formatDistance(hike.distanceMeters)} />
        <FeaturedStat label={t('factAscent')} value={formatElevation(hike.elevationGainMeters)} />
        <FeaturedStat label={t('factElevationRange')} value={elevationRangeLabel} />
        <FeaturedStat
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
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 16,
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#A85C1F',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  cardGlow: {
    backgroundColor: 'rgba(201, 121, 46, 0.12)',
    borderRadius: 999,
    height: 180,
    position: 'absolute',
    right: -58,
    top: -70,
    width: 180,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.highlightSoft,
    borderColor: palette.highlight,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eyebrow: {
    color: palette.highlight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: palette.highlight,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 16,
    shadowColor: '#A85C1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  actionButtonText: {
    color: palette.sandText,
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
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  chipWarmText: {
    color: palette.highlightText,
  },
  previewFrame: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 26,
    gap: 8,
    overflow: 'hidden',
    padding: 12,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 18,
    flexGrow: 1,
    minWidth: 140,
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
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 4,
  },
});
