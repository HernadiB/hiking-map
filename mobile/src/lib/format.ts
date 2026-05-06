import type { AppLanguage, DifficultyLevel, HikeSourceType } from '../types/hikes';

let currentFormattingLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';

function getDateFormatter(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function setFormattingLocale(locale: string): void {
  currentFormattingLocale = locale;
}

export function formatDistance(distanceMeters: number): string {
  const distanceInKilometers = distanceMeters / 1000;
  const decimals = distanceInKilometers >= 10 ? 0 : 1;
  return `${distanceInKilometers.toFixed(decimals)} km`;
}

export function formatElevation(elevationMeters: number): string {
  return `${Math.round(elevationMeters)} m`;
}

export function formatPace(
  secondsPerKilometer: number | null,
  options?: {
    language?: AppLanguage;
    unavailableLabel?: string;
  }
): string {
  const language = options?.language ?? 'en';
  const unavailableLabel = options?.unavailableLabel ?? 'Not available';

  if (secondsPerKilometer === null) {
    return unavailableLabel;
  }

  const totalMinutes = Math.floor(secondsPerKilometer / 60);
  const seconds = Math.round(secondsPerKilometer % 60)
    .toString()
    .padStart(2, '0');
  return language === 'hu'
    ? `${totalMinutes}:${seconds} perc/km`
    : `${totalMinutes}:${seconds} min/km`;
}

export function formatDifficulty(level: DifficultyLevel): string {
  return level;
}

export function formatDuration(
  durationSeconds: number | null,
  options?: {
    language?: AppLanguage;
    unavailableLabel?: string;
  }
): string {
  const language = options?.language ?? 'en';
  const unavailableLabel = options?.unavailableLabel ?? 'Not available';

  if (durationSeconds === null) {
    return unavailableLabel;
  }

  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = language === 'hu' ? 'ó' : 'h';
  const minuteLabel = language === 'hu' ? 'perc' : 'min';

  if (hours === 0) {
    return `${minutes} ${minuteLabel}`;
  }

  if (minutes === 0) {
    return `${hours} ${hourLabel}`;
  }

  return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}

export function formatDateTime(
  value: string | null,
  options?: {
    locale?: string;
    unavailableLabel?: string;
  }
): string {
  const locale = options?.locale ?? currentFormattingLocale;
  const unavailableLabel = options?.unavailableLabel ?? 'Not available';

  if (!value) {
    return unavailableLabel;
  }

  return getDateFormatter(locale).format(new Date(value));
}

export function formatSourceType(sourceType: HikeSourceType): string {
  return sourceType === 'file' ? 'File import' : 'URL import';
}
