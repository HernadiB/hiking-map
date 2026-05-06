import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppLanguageProvider, useI18n } from '../src/lib/i18n';
import { palette } from '../src/lib/theme';

function RootNavigator() {
  const { t } = useI18n();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
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
    <AppLanguageProvider>
      <RootNavigator />
    </AppLanguageProvider>
  );
}
