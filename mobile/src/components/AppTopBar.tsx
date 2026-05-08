import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useI18n } from '../lib/i18n';
import { palette } from '../lib/theme';
import { useAppTheme } from '../lib/theme-context';

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
  const { colors, resolvedTheme, toggleTheme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor:
            resolvedTheme === 'dark' ? 'rgba(22, 33, 25, 0.86)' : 'rgba(246, 249, 241, 0.74)',
          borderColor:
            resolvedTheme === 'dark' ? 'rgba(94, 124, 101, 0.62)' : 'rgba(196, 209, 190, 0.76)',
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leading}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              onPress={onBackPress}
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.backButtonText, { color: colors.text }]}>{t('commonBack')}</Text>
            </Pressable>
          ) : (
            <View style={[styles.brandBadge, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.brandBadgeText, { color: colors.accentStrong }]}>
                {t('appName')}
              </Text>
            </View>
          )}

          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={resolvedTheme === 'dark' ? 'Világos mód' : 'Sötét mód'}
            accessibilityRole="button"
            onPress={toggleTheme}
            style={({ pressed }) => [
              styles.themeButton,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.themeButtonText, { color: colors.text }]}>
              {resolvedTheme === 'dark' ? '☀' : '☾'}
            </Text>
          </Pressable>

          {menuContent ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsMenuOpen((current) => !current)}
              style={({ pressed }) => [
                styles.menuButton,
                { backgroundColor: colors.accentStrong },
                pressed && styles.buttonPressed,
              ]}
            >
              <HamburgerIcon />
              {!isCompact ? <Text style={styles.menuButtonText}>{t('navMenu')}</Text> : null}
            </Pressable>
          ) : null}
        </View>
      </View>

      {isMenuOpen && menuContent ? (
        <View
          style={[
            styles.menuPanel,
            {
              backgroundColor: colors.panelRaised,
              borderColor: colors.border,
              shadowColor: resolvedTheme === 'dark' ? '#000000' : '#102016',
            },
          ]}
        >
          {menuContent}
        </View>
      ) : null}
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
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  leading: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
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
    minWidth: 0,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 12,
    flexShrink: 1,
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
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  themeButtonText: {
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  menuButtonText: {
    color: palette.sandText,
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
    backgroundColor: palette.sandText,
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
    maxWidth: '100%',
    padding: 14,
    shadowColor: '#102016',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
});
