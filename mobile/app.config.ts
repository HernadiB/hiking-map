import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { ExpoConfig } from 'expo/config';

function readOptionalBooleanEnv(value: string | undefined): boolean | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function decodeHexEncodedKey(value: string): string {
  const normalizedValue = value.trim();

  if (!/^(?:[0-9A-Fa-f]{2}\s+)+[0-9A-Fa-f]{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const bytes = normalizedValue.split(/\s+/).map((entry) => Number.parseInt(entry, 16));
  return Buffer.from(bytes).toString('ascii').trim();
}

function normalizeBaseUrl(value: string | undefined): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue || normalizedValue === '/') {
    return '';
  }

  const withLeadingSlash = normalizedValue.startsWith('/')
    ? normalizedValue
    : `/${normalizedValue}`;

  return withLeadingSlash.replace(/\/+$/, '');
}

function readGoogleMapsApiKey(): {
  value: string | null;
  source: 'env' | 'localFile' | null;
} {
  const envCandidates = [
    process.env.GOOGLE_MAPS_API_KEY,
    process.env.ANDROID_GOOGLE_MAPS_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  ];

  for (const candidate of envCandidates) {
    const normalizedCandidate = candidate?.trim();

    if (normalizedCandidate) {
      return {
        value: normalizedCandidate,
        source: 'env',
      };
    }
  }

  const localMapsKeyPath = path.join(os.homedir(), '.android', 'maps.key');

  if (!fs.existsSync(localMapsKeyPath)) {
    return {
      value: null,
      source: null,
    };
  }

  const fileValue = decodeHexEncodedKey(fs.readFileSync(localMapsKeyPath, 'utf8'));
  return {
    value: fileValue || null,
    source: fileValue ? 'localFile' : null,
  };
}

const googleMapsApiKey = readGoogleMapsApiKey();
const importsEnabledFromEnv = readOptionalBooleanEnv(process.env.EXPO_PUBLIC_ENABLE_HIKE_IMPORTS);
const readOnlyModeFromEnv = readOptionalBooleanEnv(process.env.EXPO_PUBLIC_READ_ONLY_MODE);
const defaultImportsEnabled = process.env.NODE_ENV !== 'production';
const hikeImportsEnabled =
  readOnlyModeFromEnv === true ? false : (importsEnabledFromEnv ?? defaultImportsEnabled);
const readOnlyMode = readOnlyModeFromEnv ?? !hikeImportsEnabled;
const webBasePath = normalizeBaseUrl(process.env.EXPO_PUBLIC_WEB_BASE_PATH);
const publicHikesFeedUrl =
  process.env.EXPO_PUBLIC_HIKES_FEED_URL?.trim() || `${webBasePath}/data/public-hikes.json`;

const config: ExpoConfig = {
  name: 'Hiking Map',
  slug: 'hiking-map',
  scheme: 'hikingmap',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.anonymous.hikingmap',
    config: googleMapsApiKey.value
      ? {
          googleMaps: {
            apiKey: googleMapsApiKey.value,
          },
        }
      : undefined,
  },
  web: {
    favicon: './assets/favicon.png',
    output: 'single',
  },
  experiments: webBasePath
    ? {
        baseUrl: webBasePath,
      }
    : undefined,
  plugins: ['expo-router', 'expo-sqlite'],
  extra: {
    hasGoogleMapsApiKey: Boolean(googleMapsApiKey.value),
    hikeImportsEnabled,
    publicHikesFeedUrl,
    readOnlyMode,
    useNativeAndroidMap: googleMapsApiKey.source === 'env',
    webBasePath,
  },
};

export default config;
