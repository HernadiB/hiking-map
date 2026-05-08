import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';

export function RecordedMonthStrip({
  monthIndex,
}: {
  monthIndex: number | null;
}) {
  const { language, t } = useI18n();
  const monthLabels =
    language === 'hu'
      ? ['J', 'F', 'M', 'Á', 'M', 'J', 'J', 'A', 'Sz', 'O', 'N', 'D']
      : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{t('monthTitle')}</Text>
      <View style={styles.row}>
        {monthLabels.map((label, index) => {
          const isActive = monthIndex === index;

          return (
            <View key={`${label}-${index}`} style={[styles.monthChip, isActive && styles.monthChipActive]}>
              <Text style={[styles.monthLabel, isActive && styles.monthLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.caption}>
        {monthIndex === null ? t('monthMissing') : t('monthPresent')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthChip: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthChipActive: {
    backgroundColor: palette.accentStrong,
    borderColor: palette.accentStrong,
  },
  monthLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  monthLabelActive: {
    color: palette.sandText,
  },
  caption: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
