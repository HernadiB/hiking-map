import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';

import { assertHikeImportsEnabled } from './app-features';
import { parseGpxDocument } from './gpx';
import { saveHike } from './hikes-store';
import type { HikeRecord } from '../types/hikes';

async function readPickedFile(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (asset.file) {
    return asset.file.text();
  }

  try {
    const file = new ExpoFile(asset.uri);
    return await file.text();
  } catch {
    return LegacyFileSystem.readAsStringAsync(asset.uri);
  }
}

function getUrlFileName(url: string): string {
  const cleanUrl = url.split('?')[0]?.split('#')[0] ?? url;
  return cleanUrl.split('/').filter(Boolean).pop() ?? 'Imported hike.gpx';
}

function isLikelyGpxText(text: string, contentType: string | null): boolean {
  if (contentType?.includes('gpx') || contentType?.includes('xml')) {
    return /<gpx[\s>]/i.test(text);
  }

  return /<gpx[\s>]/i.test(text);
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function sanitizeCandidateValue(value: string): string {
  return decodeHtmlText(value.trim()).replace(/^['"]|['"]$/g, '');
}

function resolveCandidateUrl(candidate: string, baseUrl: string): string | null {
  const normalizedCandidate = sanitizeCandidateValue(candidate);

  if (
    !normalizedCandidate ||
    normalizedCandidate.startsWith('#') ||
    normalizedCandidate.startsWith('javascript:') ||
    normalizedCandidate.startsWith('mailto:') ||
    normalizedCandidate.startsWith('tel:') ||
    normalizedCandidate.startsWith('data:')
  ) {
    return null;
  }

  try {
    return new URL(normalizedCandidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function scoreGpxCandidate(candidateUrl: string, context: string, pageOrigin: string): number {
  let score = 0;

  if (/\.gpx(?:[?#].*)?$/i.test(candidateUrl)) {
    score += 120;
  }

  if (/[?&](format|type|filetype|download)=gpx\b/i.test(candidateUrl)) {
    score += 80;
  }

  if (/\/gpx(?:[/?#]|$)/i.test(candidateUrl)) {
    score += 60;
  }

  if (/download|export|file/i.test(context)) {
    score += 20;
  }

  if (/gpx/i.test(context)) {
    score += 30;
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg|css|js|json)(?:[?#].*)?$/i.test(candidateUrl)) {
    score -= 150;
  }

  try {
    const candidateOrigin = new URL(candidateUrl).origin;

    if (candidateOrigin === pageOrigin) {
      score += 15;
    }
  } catch {
    score -= 30;
  }

  return score;
}

function extractHtmlTitle(htmlText: string, pageUrl: string): string {
  const titleMatch =
    htmlText.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);

  const rawTitle = titleMatch?.[1]?.trim();

  if (!rawTitle) {
    return getUrlFileName(pageUrl);
  }

  return decodeHtmlText(rawTitle)
    .replace(/\s+[•|-]\s+.*$/u, '')
    .trim();
}

function findCandidateUrlsFromHtml(htmlText: string, pageUrl: string): string[] {
  const pageOrigin = new URL(pageUrl).origin;
  const candidates = new Map<string, number>();
  const patterns = [
    /\b(?:href|src|data-[\w:-]+|content|action)\s*=\s*["']([^"']+)["']/gi,
    /["']([^"']*(?:\.gpx(?:[?#][^"']*)?|[?&](?:format|type|filetype|download)=gpx\b[^"']*|\/gpx(?:[/?#][^"']*)?))["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of htmlText.matchAll(pattern)) {
      const rawCandidate = match[1];
      const resolvedCandidateUrl = resolveCandidateUrl(rawCandidate, pageUrl);

      if (!resolvedCandidateUrl) {
        continue;
      }

      const contextStart = Math.max(0, (match.index ?? 0) - 120);
      const contextEnd = Math.min(htmlText.length, (match.index ?? 0) + match[0].length + 120);
      const context = htmlText.slice(contextStart, contextEnd);
      const score = scoreGpxCandidate(resolvedCandidateUrl, context, pageOrigin);

      if (score <= 0) {
        continue;
      }

      const previousScore = candidates.get(resolvedCandidateUrl) ?? Number.NEGATIVE_INFINITY;

      if (score > previousScore) {
        candidates.set(resolvedCandidateUrl, score);
      }
    }
  }

  return [...candidates.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([candidateUrl]) => candidateUrl);
}

async function fetchTextDocument(url: string): Promise<{
  text: string;
  finalUrl: string;
  contentType: string | null;
}> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`The provided URL returned ${response.status}.`);
  }

  return {
    text: await response.text(),
    finalUrl: response.url || url,
    contentType: response.headers.get('content-type'),
  };
}

async function resolveGpxPayloadFromUrl(url: string): Promise<{
  xmlText: string;
  fallbackTitle: string;
}> {
  const initialDocument = await fetchTextDocument(url);

  if (isLikelyGpxText(initialDocument.text, initialDocument.contentType)) {
    return {
      xmlText: initialDocument.text,
      fallbackTitle: getUrlFileName(initialDocument.finalUrl),
    };
  }

  const pageTitle = extractHtmlTitle(initialDocument.text, initialDocument.finalUrl);
  const gpxCandidates = findCandidateUrlsFromHtml(initialDocument.text, initialDocument.finalUrl);
  const candidateErrors: string[] = [];

  for (const candidateUrl of gpxCandidates) {
    try {
      const candidateDocument = await fetchTextDocument(candidateUrl);

      if (!isLikelyGpxText(candidateDocument.text, candidateDocument.contentType)) {
        candidateErrors.push(`Resolved candidate did not contain GPX data: ${candidateUrl}`);
        continue;
      }

      return {
        xmlText: candidateDocument.text,
        fallbackTitle: pageTitle || getUrlFileName(candidateUrl),
      };
    } catch (error) {
      candidateErrors.push(error instanceof Error ? error.message : `Could not load ${candidateUrl}`);
    }
  }

  if (gpxCandidates.length === 0) {
    throw new Error(
      'No GPX download link could be found on the provided page. Try a direct GPX link or another tour page.'
    );
  }

  throw new Error(
    `The page was loaded, but none of the detected GPX links could be imported. ${candidateErrors[0] ?? ''}`.trim()
  );
}

export async function pickAndImportHike(): Promise<HikeRecord | null> {
  assertHikeImportsEnabled();

  const result = await DocumentPicker.getDocumentAsync({
    base64: false,
    copyToCacheDirectory: true,
    multiple: false,
    type: '*/*',
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  const xmlText = await readPickedFile(asset);
  const draft = parseGpxDocument(xmlText, {
    fallbackTitle: asset.name,
    sourceType: 'file',
    sourceValue: asset.name,
  });

  return saveHike(draft);
}

export async function importHikeFromUrl(url: string): Promise<HikeRecord> {
  assertHikeImportsEnabled();

  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new Error('Enter a tour page URL or a direct GPX URL before starting the import.');
  }

  const { xmlText, fallbackTitle } = await resolveGpxPayloadFromUrl(normalizedUrl);
  const draft = parseGpxDocument(xmlText, {
    fallbackTitle,
    sourceType: 'url',
    sourceValue: normalizedUrl,
  });

  return saveHike(draft);
}
