import Constants from 'expo-constants';

function readBooleanExtra(name: 'hikeImportsEnabled' | 'readOnlyMode', fallback: boolean): boolean {
  const value = Constants.expoConfig?.extra?.[name];
  return typeof value === 'boolean' ? value : fallback;
}

export function areHikeImportsEnabled(): boolean {
  return readBooleanExtra('hikeImportsEnabled', true);
}

export function isReadOnlyMode(): boolean {
  return readBooleanExtra('readOnlyMode', false);
}

export function assertHikeImportsEnabled(): void {
  if (!areHikeImportsEnabled()) {
    throw new Error('Hike imports are disabled in this build.');
  }
}
