import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { getPreferredLanguage, setPreferredLanguage } from './settings-store';
import { setFormattingLocale } from './format';
import type { AppLanguage, DifficultyLevel, HikeRouteType, HikeSourceType } from '../types/hikes';

const translations = {
  en: {
    appName: 'Hiking Map',
    homeTitle: 'Hiking Map',
    detailTitle: 'Hike details',
    commonNotAvailable: 'Not available',
    commonSelected: 'Selected',
    commonRefreshing: 'Refreshing...',
    commonLanguage: 'Language',
    commonBack: 'Back',
    commonStart: 'Start',
    commonFinish: 'Finish',
    mapFallbackTitle: 'Map preview mode',
    mapFallbackBody:
      'Android needs a Google Maps API key for the live native map. Until that is configured, the route overview stays available here without crashing the app.',
    navMenu: 'Menu',
    navImportSection: 'Import',
    navLanguageSection: 'Language',
    navPublishingSection: 'Publishing',
    languageEnglish: 'English',
    languageHungarian: 'Magyar',
    difficultyEasy: 'Easy',
    difficultyModerate: 'Moderate',
    difficultyHard: 'Hard',
    sourceFile: 'File import',
    sourceUrl: 'URL import',
    routeTypeLoop: 'Loop hike',
    routeTypePointToPoint: 'Point-to-point',
    routeDynamicsFlat: 'Flat',
    routeDynamicsRolling: 'Rolling',
    routeDynamicsClimb: 'Climb',
    routeDynamicsDescent: 'Descent',
    homeHeroEyebrow: 'Universal hiking journal',
    homeHeroTitle: 'See every imported hike together on one map.',
    homeHeroBody:
      'Import GPX files or direct GPX links, keep the routes locally, and switch the app language whenever you need.',
    homeHeroFootnote: 'Inspired by the best patterns from route planners and trail guide apps.',
    homeImportTitle: 'Import a hike',
    homeImportBody:
      'This version supports GPX files, tour page URLs with downloadable GPX content, direct GPX URLs, and shared app links with an importUrl query parameter.',
    homePickFile: 'Pick a GPX file',
    homeImportingFile: 'Importing file...',
    homeImportUrl: 'Import link',
    homeImporting: 'Importing...',
    homeUrlPlaceholder: 'https://example.com/tour-page-or-hike.gpx',
    homeUrlFieldLabel: 'Tour page or GPX link',
    homeReadOnlyTitle: 'Read-only collection',
    homeReadOnlyBody:
      'This published build is view-only. Hike imports stay available only in the owner or admin build.',
    homeImportsDisabled: 'Hike imports are disabled in this build.',
    homeExportPublicFeed: 'Download public feed JSON',
    homeExportingPublicFeed: 'Preparing public feed...',
    homeExportPublicFeedBody:
      'Download the shared hikes feed, replace `mobile/public/data/public-hikes.json` in the repository, then push to publish the updated website.',
    homeExportedPublicFeed: 'Downloaded the public hikes feed JSON.',
    homeCorsHint:
      'Browser link imports depend on the remote page and GPX download allowing direct fetch requests with CORS.',
    homeSharedLinkExample: 'Shared-link example',
    homeMapTitle: 'Imported hikes overview',
    homeMapSubtitle: '{{count}} route{{suffix}} shown together on the map.',
    homeMapViewLabel: 'Current map view',
    homeMapViewCount: '{{count}} route{{suffix}} visible in this view.',
    homeMapHint:
      'Tap a route to highlight it. Hover with the pointer or long-press on touch to preview its key stats.',
    homeLegendSelected: 'Selected route',
    homeLegendOtherRoutes: 'Other saved routes',
    homeTracksShown: 'Tracks shown',
    homeTotalDistance: 'Total distance',
    homeTotalAscent: 'Total ascent',
    homeHighestPoint: 'Highest point reached',
    homeCollectionSnapshot: 'Collection snapshot',
    homeCollectionSnapshotShow: 'Show collection snapshot',
    homeCollectionSnapshotHide: 'Hide collection snapshot',
    homeSelectedRoute: 'Selected route',
    homeSelectedRouteFallback: 'Choose a hike from the list below to inspect it in more detail.',
    homeOpenDetails: 'Open details',
    homeNoHikesTitle: 'No hikes yet',
    homeNoHikesBody: 'Import a GPX file or a link to see your first saved route here.',
    homeSavedHikesTitle: 'Saved hikes',
    homeSavedHikesEmpty: 'Your imported hikes will appear here.',
    homeSavedHikesCount: '{{count}} hike{{suffix}} stored locally',
    homeImportedShared: 'Imported "{{title}}" from the shared link.',
    homeImportedFile: 'Imported "{{title}}" from a GPX file.',
    homeImportedUrl: 'Imported "{{title}}" from the provided URL.',
    homeError: 'Something went wrong while processing the hike.',
    detailLoadError: 'This hike could not be loaded.',
    detailNoId: 'No hike id was provided.',
    detailMissing: 'This hike does not exist anymore.',
    detailSaveImage: 'Save summary image',
    detailSavingImage: 'Saving image...',
    detailShareImage: 'Share image',
    detailSharingImage: 'Opening share sheet...',
    detailOpenSource: 'Open source',
    detailDownloadedImage: 'Downloaded the summary image.',
    detailSavedImage: 'Saved the summary image to the device library.',
    detailShareSheetOpened: 'Opened the share sheet for the summary image.',
    detailSavedViaShareSheet:
      'Media library access was denied, so the image was opened in the share sheet.',
    detailPermissionRequired: 'Media library permission is required to save the summary image.',
    detailSharingUnavailable: 'Sharing is not available on this device.',
    detailMapTitle: 'Interactive map',
    detailMapDescription:
      'Pan and zoom the finished route like a regular map, and use the elevation profile below to highlight exact points on the track.',
    detailProfileDrawerOpen: 'Open elevation profile',
    detailProfileDrawerClose: 'Hide elevation profile',
    detailProfileDrawerHint:
      'Open the profile from the top of the map when you want to inspect altitude changes against the route in more detail.',
    detailFactsTitle: 'Tour facts',
    detailFactsDescription:
      'These metrics describe terrain shape, route closure, and how concentrated the climbing is along the hike.',
    detailElevationTitle: 'Elevation profile',
    detailElevationDescription:
      'Elevation sampled along the full route. Move across it to inspect the matching position on the map.',
    detailDynamicsTitle: 'Route dynamics',
    detailDynamicsDescription:
      'Each segment is classified from the GPX elevation trace into flat, rolling, climb, and descent zones.',
    detailMonthTitle: 'Recorded month',
    detailMonthDescription:
      'Imported GPX timestamps can be placed on a simple month strip for quick seasonal context.',
    detailPosterTitle: 'Shareable summary',
    detailPosterDescription:
      'This poster is designed for stable image export on web and mobile without depending on live map tiles.',
    detailPosterActionTitle: 'Export-ready route card',
    detailPosterActionBody:
      'Create a clean summary card for trip recaps, sharing, or offline archiving.',
    detailPosterActionWebHint:
      'On web the card downloads as a PNG. On mobile it can be saved locally or shared from the system sheet.',
    detailPosterActionNativeHint:
      'Use the primary action to save the card, or send it straight to the system share sheet.',
    detailSourceTitle: 'Source',
    detailSourceDescription:
      'The original import source is kept so the route can be traced back to the file or direct link.',
    detailSourceOriginal: 'Original source value',
    detailRecordedImported: 'Recorded {{recorded}} | Imported {{imported}}',
    detailOverview:
      '{{difficulty}} {{routeType}} with {{distance}} of recorded distance and {{ascent}} of ascent{{durationPart}}.',
    detailOverviewDurationPart: ' completed in {{duration}}',
    factDistance: 'Distance',
    factDuration: 'Duration',
    factAscent: 'Ascent',
    factDescent: 'Descent',
    factPace: 'Pace',
    factDifficulty: 'Difficulty',
    factRouteType: 'Route type',
    factDominantTerrain: 'Dominant terrain',
    factHighestPoint: 'Highest point',
    factLowestPoint: 'Lowest point',
    factElevationRange: 'Elevation range',
    factStartFinishGap: 'Start-to-finish gap',
    factClimbPerKilometer: 'Climb per km',
    factDescentPerKilometer: 'Descent per km',
    factSteepestClimb: 'Steepest climb',
    factSteepestDescent: 'Steepest descent',
    factAverageGrade: 'Average grade',
    factTrackPoints: 'Track points',
    factSource: 'Source',
    chartElevationUnavailable: 'Elevation data is not available for this hike.',
    chartLowestPoint: 'Lowest point',
    chartHighestPoint: 'Highest point',
    chartDistanceSpan: 'Distance span',
    chartFocusedDistance: 'Current distance',
    chartFocusedElevation: 'Current elevation',
    chartInteractiveHint: 'Hover or drag across the profile to preview the matching location on the route.',
    chartDynamicsUnavailable: 'Not enough elevation data to classify route dynamics.',
    detailSignatureTitle: 'Route signature',
    detailSignatureDescription:
      'A tighter summary of closure, steepness, elevation spread, and the climb load per kilometer.',
    monthTitle: 'Recorded month',
    monthMissing: 'No timestamp was found in the imported GPX data.',
    monthPresent: 'The highlighted month matches the recorded start date.',
  },
  hu: {
    appName: 'Túratérkép',
    homeTitle: 'Túratérkép',
    detailTitle: 'Túra részletei',
    commonNotAvailable: 'Nem elérhető',
    commonSelected: 'Kiválasztva',
    commonRefreshing: 'Frissítés...',
    commonLanguage: 'Nyelv',
    commonBack: 'Vissza',
    commonStart: 'Rajt',
    commonFinish: 'Cél',
    mapFallbackTitle: 'Térkép előnézeti mód',
    mapFallbackBody:
      'Androidon a valódi natív térképhez Google Maps API kulcs kell. Amíg ez nincs beállítva, itt stabil útvonal-előnézet jelenik meg összeomlás nélkül.',
    navMenu: 'Menü',
    navImportSection: 'Importálás',
    navLanguageSection: 'Nyelv',
    navPublishingSection: 'Publikálás',
    languageEnglish: 'English',
    languageHungarian: 'Magyar',
    difficultyEasy: 'Könnyű',
    difficultyModerate: 'Közepes',
    difficultyHard: 'Nehéz',
    sourceFile: 'Fájlimport',
    sourceUrl: 'URL import',
    routeTypeLoop: 'Körtúra',
    routeTypePointToPoint: 'Ponttól pontig',
    routeDynamicsFlat: 'Sík',
    routeDynamicsRolling: 'Hullámos',
    routeDynamicsClimb: 'Emelkedő',
    routeDynamicsDescent: 'Lejtő',
    homeHeroEyebrow: 'Saját túranapló',
    homeHeroTitle: 'Lásd egyszerre az összes importált túrádat egy térképen.',
    homeHeroBody:
      'Importálj GPX fájlokat vagy közvetlen GPX linkeket, tárold őket helyben, és válts nyelvet bármikor.',
    homeHeroFootnote: 'A legjobb túraoldalak és útvonaltervezők bevált mintái alapján.',
    homeImportTitle: 'Túra importálása',
    homeImportBody:
      'Ez a verzió GPX fájlokat, letölthető GPX-et tartalmazó túraoldal-linkeket, közvetlen GPX URL-eket és importUrl paraméteres megosztott linkeket támogat.',
    homePickFile: 'GPX fájl kiválasztása',
    homeImportingFile: 'Fájl importálása...',
    homeImportUrl: 'Link importálása',
    homeImporting: 'Importálás...',
    homeUrlPlaceholder: 'https://example.com/tour-page-or-hike.gpx',
    homeUrlFieldLabel: 'Túraoldal vagy GPX link',
    homeReadOnlyTitle: 'Csak megtekinthető gyűjtemény',
    homeReadOnlyBody:
      'Ez a publikált build csak megtekintésre szolgál. A túraimport csak a tulajdonosi vagy admin buildben érhető el.',
    homeImportsDisabled: 'Ebben a buildben a túraimport le van tiltva.',
    homeExportPublicFeed: 'Publikus feed JSON letöltése',
    homeExportingPublicFeed: 'Publikus feed előkészítése...',
    homeExportPublicFeedBody:
      'Töltsd le a közös túrafeedet, cseréld le vele a repóban a `mobile/public/data/public-hikes.json` fájlt, majd pushold ki a frissített weboldal publikálásához.',
    homeExportedPublicFeed: 'A publikus túrafeed JSON letöltve.',
    homeCorsHint:
      'Böngészőben a linkimport attól függ, hogy a távoli oldal és a GPX letöltés engedi-e a közvetlen CORS lekérést.',
    homeSharedLinkExample: 'Megosztott link példa',
    homeMapTitle: 'Importált túrák áttekintése',
    homeMapSubtitle: '{{count}} útvonal jelenik meg egyszerre a térképen.',
    homeMapViewLabel: 'Aktuális térképnézet',
    homeMapViewCount: '{{count}} útvonal látszik ebben a nézetben.',
    homeMapHint:
      'Érints meg egy útvonalat a kiemeléshez. Tartsd rajta az egeret vagy nyomd hosszan, és megjelennek a fő adatai.',
    homeLegendSelected: 'Kiválasztott útvonal',
    homeLegendOtherRoutes: 'Többi mentett útvonal',
    homeTracksShown: 'Látható útvonalak',
    homeTotalDistance: 'Össztáv',
    homeTotalAscent: 'Összes emelkedés',
    homeHighestPoint: 'Legmagasabb elért pont',
    homeCollectionSnapshot: 'Gyűjtemény összképe',
    homeCollectionSnapshotShow: 'Gyűjtemény összképének megnyitása',
    homeCollectionSnapshotHide: 'Gyűjtemény összképének elrejtése',
    homeSelectedRoute: 'Kiválasztott útvonal',
    homeSelectedRouteFallback: 'Válassz túrát az alábbi listából a részletesebb nézethez.',
    homeOpenDetails: 'Részletek',
    homeNoHikesTitle: 'Még nincs túra',
    homeNoHikesBody: 'Importálj GPX fájlt vagy linket, és itt megjelenik az első mentett útvonalad.',
    homeSavedHikesTitle: 'Mentett túrák',
    homeSavedHikesEmpty: 'Az importált túrák itt fognak megjelenni.',
    homeSavedHikesCount: '{{count}} túra tárolva helyben',
    homeImportedShared: 'A(z) "{{title}}" túra importálva lett a megosztott linkből.',
    homeImportedFile: 'A(z) "{{title}}" túra importálva lett GPX fájlból.',
    homeImportedUrl: 'A(z) "{{title}}" túra importálva lett a megadott URL-ről.',
    homeError: 'Hiba történt a túra feldolgozása közben.',
    detailLoadError: 'A túra nem tölthető be.',
    detailNoId: 'Nem érkezett túraazonosító.',
    detailMissing: 'Ez a túra már nem létezik.',
    detailSaveImage: 'Összegző kép mentése',
    detailSavingImage: 'Kép mentése...',
    detailShareImage: 'Kép megosztása',
    detailSharingImage: 'Megosztás megnyitása...',
    detailOpenSource: 'Forrás megnyitása',
    detailDownloadedImage: 'Az összegző kép letöltve.',
    detailSavedImage: 'Az összegző kép mentve lett a készülék galériájába.',
    detailShareSheetOpened: 'Megnyílt a megosztási nézet az összegző képhez.',
    detailSavedViaShareSheet:
      'A médiatár-hozzáférés elutasítva, ezért a kép a megosztási nézetben nyílt meg.',
    detailPermissionRequired: 'Az összegző kép mentéséhez médiatár-hozzáférés szükséges.',
    detailSharingUnavailable: 'A megosztás ezen az eszközön nem érhető el.',
    detailMapTitle: 'Interaktív térkép',
    detailMapDescription:
      'Mozgasd és nagyítsd az útvonalat úgy, mint egy megszokott térképen, és a magasságprofilról kiemelheted a nyomvonal pontos pontjait.',
    detailProfileDrawerOpen: 'Magasságprofil lenyitása',
    detailProfileDrawerClose: 'Magasságprofil elrejtése',
    detailProfileDrawerHint:
      'A térkép tetejéről nyisd le a profilt, ha részletesebben akarod a szintváltozásokat az útvonalhoz igazítva nézni.',
    detailFactsTitle: 'Túraadatok',
    detailFactsDescription:
      'Ezek a mutatók azt írják le, mennyire záródik vissza az útvonal, mennyire meredek, és mennyire koncentrált rajta a szintemelkedés.',
    detailElevationTitle: 'Magasságprofil',
    detailElevationDescription:
      'A teljes útvonal mentén mintavételezett magasság. Húzd végig rajta az ujjad vagy az egered, és a térkép megmutatja a hozzá tartozó pontot.',
    detailDynamicsTitle: 'Útvonaldinamika',
    detailDynamicsDescription:
      'A GPX magassági adatok alapján minden szakasz sík, hullámos, emelkedő vagy lejtő kategóriába kerül.',
    detailMonthTitle: 'Rögzítés hónapja',
    detailMonthDescription:
      'A GPX időbélyegek egy egyszerű hónapsávon is megjelennek a gyors szezonális kontextusért.',
    detailPosterTitle: 'Megosztható összegzés',
    detailPosterDescription:
      'Ez a poszter kifejezetten stabil webes és mobilos képexportra készült, élő térképcsempék nélkül.',
    detailPosterActionTitle: 'Exportálható túrakártya',
    detailPosterActionBody:
      'Készíts letisztult összegzőkártyát túrabeszámolókhoz, megosztáshoz vagy offline mentéshez.',
    detailPosterActionWebHint:
      'Weben a kártya PNG képként töltődik le. Mobilon menthető a készülékre vagy megosztható a rendszer nézetén keresztül.',
    detailPosterActionNativeHint:
      'Az elsődleges gombbal mentsd a kártyát, vagy küldd tovább közvetlenül a rendszer megosztási felületére.',
    detailSourceTitle: 'Forrás',
    detailSourceDescription:
      'Az eredeti importforrás megmarad, így az útvonal visszakövethető a fájlhoz vagy a közvetlen linkhez.',
    detailSourceOriginal: 'Eredeti forrásérték',
    detailRecordedImported: 'Rögzítve {{recorded}} | Importálva {{imported}}',
    detailOverview:
      '{{difficulty}} {{routeType}} {{distance}} rögzített távval és {{ascent}} szintemelkedéssel{{durationPart}}.',
    detailOverviewDurationPart: ', {{duration}} időtartammal',
    factDistance: 'Táv',
    factDuration: 'Időtartam',
    factAscent: 'Emelkedés',
    factDescent: 'Lejtés',
    factPace: 'Tempó',
    factDifficulty: 'Nehézség',
    factRouteType: 'Útvonaltípus',
    factDominantTerrain: 'Jellemző terep',
    factHighestPoint: 'Legmagasabb pont',
    factLowestPoint: 'Legalacsonyabb pont',
    factElevationRange: 'Szinttartomány',
    factStartFinishGap: 'Rajt-cél távolság',
    factClimbPerKilometer: 'Emelkedés / km',
    factDescentPerKilometer: 'Lejtés / km',
    factSteepestClimb: 'Legmeredekebb emelkedő',
    factSteepestDescent: 'Legmeredekebb lejtő',
    factAverageGrade: 'Átlagos meredekség',
    factTrackPoints: 'Track pontok',
    factSource: 'Forrás',
    chartElevationUnavailable: 'Ehhez a túrához nincs elérhető magassági adat.',
    chartLowestPoint: 'Legalacsonyabb pont',
    chartHighestPoint: 'Legmagasabb pont',
    chartDistanceSpan: 'Távszakasz',
    chartFocusedDistance: 'Aktuális táv',
    chartFocusedElevation: 'Aktuális magasság',
    chartInteractiveHint: 'Vidd végig az egeret vagy húzd végig az ujjad a profilon, és a térkép megmutatja a megfelelő pontot.',
    chartDynamicsUnavailable: 'Nincs elég magassági adat az útvonal dinamikájának besorolásához.',
    detailSignatureTitle: 'Útvonal karaktere',
    detailSignatureDescription:
      'Tömörebb összegzés az útvonal záródásáról, meredekségéről, szintkülönbségéről és kilométerenkénti terheléséről.',
    monthTitle: 'Rögzítés hónapja',
    monthMissing: 'Nem található időbélyeg az importált GPX adatokban.',
    monthPresent: 'A kiemelt hónap megegyezik a rögzített kezdődátummal.',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type I18nContextValue = {
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const languageToLocale: Record<AppLanguage, string> = {
  en: 'en-US',
  hu: 'hu-HU',
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

function readDeviceLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

export function detectAppLanguage(locale = readDeviceLocale()): AppLanguage {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith('hu')) {
    return 'hu';
  }

  return 'en';
}

export function getLanguageDisplayLabel(language: AppLanguage): string {
  return language === 'hu' ? 'Magyar' : 'English';
}

function translate(
  language: AppLanguage,
  key: TranslationKey,
  values?: Record<string, string | number>
): string {
  return interpolate(translations[language][key], values);
}

export function AppLanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(detectAppLanguage());

  useEffect(() => {
    let isActive = true;

    const loadPreferredLanguage = async () => {
      const preferredLanguage = await getPreferredLanguage();

      if (isActive && preferredLanguage) {
        setLanguageState(preferredLanguage);
      }
    };

    void loadPreferredLanguage();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setFormattingLocale(languageToLocale[language]);
  }, [language]);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await setPreferredLanguage(nextLanguage);
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        locale: languageToLocale[language],
        setLanguage,
        t: (key, values) => translate(language, key, values),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside AppLanguageProvider.');
  }

  return context;
}

export function getDifficultyLabel(
  difficulty: DifficultyLevel,
  t: I18nContextValue['t']
): string {
  if (difficulty === 'Easy') {
    return t('difficultyEasy');
  }

  if (difficulty === 'Moderate') {
    return t('difficultyModerate');
  }

  return t('difficultyHard');
}

export function getSourceTypeLabel(
  sourceType: HikeSourceType,
  t: I18nContextValue['t']
): string {
  return sourceType === 'file' ? t('sourceFile') : t('sourceUrl');
}

export function getRouteTypeLabel(
  routeType: HikeRouteType,
  t: I18nContextValue['t']
): string {
  return routeType === 'loop' ? t('routeTypeLoop') : t('routeTypePointToPoint');
}

export function getRouteDynamicsLabel(
  key: 'flat' | 'rolling' | 'climb' | 'descent',
  t: I18nContextValue['t']
): string {
  if (key === 'flat') {
    return t('routeDynamicsFlat');
  }

  if (key === 'rolling') {
    return t('routeDynamicsRolling');
  }

  if (key === 'climb') {
    return t('routeDynamicsClimb');
  }

  return t('routeDynamicsDescent');
}
