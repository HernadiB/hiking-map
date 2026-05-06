import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';

function HamburgerIcon() {
  return (
    <View style={styles.icon}>
      <View style={styles.iconLine} />
      <View style={styles.iconLine} />
      <View style={styles.iconLine} />
    </View>
  );
}

export function AppTopBar({
  title,
  subtitle,
  canGoBack = false,
  onBackPress,
  menuContent,
}: {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  onBackPress?: (() => void) | undefined;
  menuContent?: ReactNode;
}) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.leading}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              onPress={onBackPress}
              style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.backButtonText}>{t('commonBack')}</Text>
            </Pressable>
          ) : (
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{t('appName')}</Text>
            </View>
          )}

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        {menuContent ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsMenuOpen((current) => !current)}
            style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
          >
            <HamburgerIcon />
            {!isCompact ? <Text style={styles.menuButtonText}>{t('navMenu')}</Text> : null}
          </Pressable>
        ) : null}
      </View>

      {isMenuOpen && menuContent ? <View style={styles.menuPanel}>{menuContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'rgba(246, 249, 241, 0.74)',
    borderColor: 'rgba(196, 209, 190, 0.76)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  leading: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: '#E1EBDD',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 11,
  },
  brandBadgeText: {
    color: palette.accentStrong,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: palette.accentStrong,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 13,
  },
  menuButtonText: {
    color: '#F4FAF1',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  icon: {
    gap: 4,
    width: 14,
  },
  iconLine: {
    backgroundColor: '#F4FAF1',
    borderRadius: 999,
    height: 2,
    width: '100%',
  },
  menuPanel: {
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 14,
    shadowColor: '#102016',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
});
