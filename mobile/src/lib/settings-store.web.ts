import type { AppLanguage } from '../types/hikes';

const STORAGE_KEY = 'hiking-map.preferred-language.v1';

export async function getPreferredLanguage(): Promise<AppLanguage | null> {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const value = localStorage.getItem(STORAGE_KEY);

  if (value !== 'en' && value !== 'hu') {
    return null;
  }

  return value;
}

export async function setPreferredLanguage(language: AppLanguage): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, language);
}
