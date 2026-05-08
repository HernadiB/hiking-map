import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppLanguageProvider, useI18n } from '../src/lib/i18n';
import { AppThemeProvider, useAppTheme } from '../src/lib/theme-context';

function RootNavigator() {
  const { t } = useI18n();
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t('homeTitle'),
          }}
        />
        <Stack.Screen
          name="hike/[id]"
          options={{
            title: t('detailTitle'),
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AppLanguageProvider>
        <RootNavigator />
      </AppLanguageProvider>
    </AppThemeProvider>
  );
}
