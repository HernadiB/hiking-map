import { StyleSheet, Text, View } from 'react-native';

import { formatDistance } from '../lib/format';
import { getRouteDynamicsLabel, useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import type { RouteDynamicsItem } from '../types/hikes';

export function RouteDynamicsChart({
  items,
}: {
  items: RouteDynamicsItem[];
}) {
  const { t } = useI18n();
  const visibleItems = items.filter((item) => item.percentage > 0);

  if (visibleItems.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{t('chartDynamicsUnavailable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.barTrack}>
        {visibleItems.map((item) => (
          <View
            key={item.key}
            style={[
              styles.barSegment,
              {
                backgroundColor: item.color,
                flex: Math.max(item.percentage, 0.03),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {visibleItems.map((item) => (
            <View key={item.key} style={styles.legendRow}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{getRouteDynamicsLabel(item.key, t)}</Text>
              </View>
              <Text style={styles.legendValue}>
                {Math.round(item.percentage * 100)}% | {formatDistance(item.distanceMeters)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderRadius: 20,
    justifyContent: 'center',
    minHeight: 120,
    padding: 18,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  barTrack: {
    borderRadius: 999,
    flexDirection: 'row',
    height: 18,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    gap: 10,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  legendLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  legendSwatch: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  legendLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  legendValue: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
