# Hiking Map

Cross-platform hiking app for viewing your own completed routes on mobile and web.

## Selected stack

- `Expo`
- `React Native`
- `TypeScript`
- `expo-router`
- `react-native-maps`
- `expo-sqlite`

## Why this stack

The app is meant for App Store, Play Store, and web delivery, with no sign-in requirement, local storage, and GPX or link-based imports. `Expo + React Native + TypeScript` is the most pragmatic fit because:

- one codebase can target iOS, Android, and web
- the mobile workflow is fast enough for MVP iteration
- cloud builds and store submission are available through `EAS Build` and `EAS Submit`
- the required capabilities already have mature Expo-compatible libraries

## Development environment

- `Node.js` LTS
- `VS Code`
- `Android Studio` for the Android emulator
- `Expo CLI`
- `EAS CLI`

## Current scope

1. map-based overview for imported hikes
2. GPX file import
3. direct GPX URL import
4. hike list and hike details screen
5. interactive route maps on mobile and web
6. route, distance, elevation, duration, timestamps, and derived hike insights
7. exportable summary image for sharing or saving
8. local-first storage without authentication

## Repository layout

- [mobile](./mobile): Expo app for iOS, Android, and web
- [docs/stack-and-architecture.md](./docs/stack-and-architecture.md): architecture and product notes
- [mobile/public/data/public-hikes.json](./mobile/public/data/public-hikes.json): shared read-only hike feed for the published website
- [mobile/public/data/example-public-hikes.json](./mobile/public/data/example-public-hikes.json): example JSON feed you can copy and adapt

## Testing the current app

### Install dependencies

```bash
cd mobile
npm ci
```

### Android Google Maps key

The native Android map uses Google Maps through `react-native-maps`.

Recommended setup:

1. copy `.env.example` to `.env`
2. set `GOOGLE_MAPS_API_KEY`
3. rebuild the Android app

### Public read-only mode

The app now supports a build-time public showcase mode.

- local development defaults to imports enabled
- production builds default to read-only
- the single source of truth is Expo config `extra.hikeImportsEnabled` / `extra.readOnlyMode`

Environment flags:

- `EXPO_PUBLIC_ENABLE_HIKE_IMPORTS=true|false`
- `EXPO_PUBLIC_READ_ONLY_MODE=true|false`
- `EXPO_PUBLIC_WEB_BASE_PATH=/hiking-map` for project-scoped GitHub Pages deployments

Recommended usage:

- public website build: `EXPO_PUBLIC_ENABLE_HIKE_IMPORTS=false`
- owner/admin build: `EXPO_PUBLIC_ENABLE_HIKE_IMPORTS=true`

When imports are disabled:

- file import is blocked
- URL import is blocked
- shared-link `importUrl` imports are ignored
- the import UI is hidden and the app shows a read-only notice

### Shared public data source

The published website no longer reads hikes from browser local storage.

- public web builds fetch the shared JSON feed from `mobile/public/data/public-hikes.json`
- the preferred format is a GPX manifest, so you only list GPX file paths stored in the repository
- owner/admin builds can still import hikes locally
- on web, the owner/admin build can download a fresh `public-hikes.json` feed from the top menu
- an example feed is available in `mobile/public/data/example-public-hikes.json`

Preferred feed shape:

```json
{
  "version": 2,
  "updatedAt": "2026-05-06T13:05:00.000Z",
  "hikes": [
    "gpx/my-first-hike.gpx",
    "gpx/my-second-hike.gpx"
  ]
}
```

How it works:

- the paths are resolved relative to `mobile/public/data/public-hikes.json`
- if the feed file lives in `mobile/public/data/`, then `gpx/my-first-hike.gpx` points to `mobile/public/data/gpx/my-first-hike.gpx`
- the app loads each GPX file at runtime and computes title, bounds, distance, elevation gain, duration, and route points automatically

Optional verbose entry:

```json
{
  "version": 2,
  "updatedAt": "2026-05-06T13:05:00.000Z",
  "hikes": [
    {
      "gpxPath": "gpx/my-first-hike.gpx",
      "id": "my_first_hike",
      "title": "My First Hike",
      "sourceType": "file",
      "sourceValue": "gpx/my-first-hike.gpx"
    }
  ]
}
```

Supported fields in the verbose entry:

- required: `gpxPath`
- optional: `id`, `title`, `createdAt`, `sourceType`, `sourceValue`

Recommended update workflow:

1. place your `.gpx` files under `mobile/public/data/gpx/`
2. update `mobile/public/data/public-hikes.json` with the GPX paths
3. commit and push
4. GitHub Pages republishes the site automatically

### GitHub Pages publishing

The repository includes a GitHub Pages deployment workflow:

- [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)

What it does:

- builds the Expo web app in read-only mode
- serves the shared feed from `mobile/public/data/public-hikes.json`
- creates a `404.html` SPA fallback for client-side routing
- deploys the `dist` output to GitHub Pages
- prefixes web assets and the public feed URL for the `/hiking-map` GitHub Pages base path

Repository setup required once:

1. open GitHub repository settings
2. go to `Pages`
3. set the source to `GitHub Actions`
4. push to `main` or `master`

If the repository name changes, update `EXPO_PUBLIC_WEB_BASE_PATH` in the Pages workflow to match the new GitHub Pages path.

Local fallback on this machine:

- if `GOOGLE_MAPS_API_KEY` is not set, the Expo app config also checks `%USERPROFILE%\.android\maps.key`
- `%USERPROFILE%\.android\maps.key` is treated as a local convenience source for config injection only
- the native Android Google Maps view is enabled only when the key is provided explicitly through `.env`
- when no explicit `.env` key is available, Android falls back to a stable route preview instead of crashing

After adding or changing the key:

```bash
cd C:\dev\hiking-map\mobile
npx expo prebuild --platform android
```

### Convenience start scripts

From the repository root:

```bash
.\start-web.cmd
.\start-mobile.cmd
```

Useful options:

- `.\start-mobile.cmd -LaunchEmulator`: starts the preferred Android emulator when no device is connected
- `.\start-mobile.cmd -Clear`: starts the mobile Metro server with a clean cache
- `.\start-web.cmd -Clear`: starts the web server with a clean cache

Notes:

- the mobile script automatically prefers `C:\dev\hiking-map` when the current repository path contains spaces or non-ASCII characters
- the web script runs from the current repository copy unless `HIKING_MAP_APP_ROOT` is set explicitly

### Run in the browser

```bash
cd mobile
npm run web
```

This starts the Expo web development server and opens the current browser build.

### Run on Android

For native Android builds on this Windows machine, use the ASCII-safe junction path:

```bash
cd C:\dev\hiking-map\mobile
npm run android
```

The junction avoids issues caused by the accented and spaced user profile path.

Important note:

- Expo native autolinking can still resolve the original real path behind a Windows junction
- for reliable Android builds, the repository itself should ultimately live in a plain ASCII path such as `C:\dev\hiking-map`

```bash
cd C:\dev\hiking-map\mobile
npm run android
```

Requirements:

- Android Studio
- Android SDK
- at least one Android Virtual Device

Recommended setup on Windows:

1. open Android Studio
2. complete the first-run setup wizard
3. install the Android SDK, Platform-Tools, and Emulator components
4. open Device Manager and create a Pixel emulator
5. start the emulator
6. run `npm run android`

Current local setup status:

- Android Studio is installed
- Android SDK and command-line tools are installed under `C:\Android\AndroidStudio`
- Android Platform-Tools are installed
- the `HikingMap_Pixel_8_API_36` Android Virtual Device is created
- the real ASCII-safe repository copy is available at `C:\dev\hiking-map`

### Run on a physical phone

```bash
cd mobile
npm run start
```

Then connect with:

- Expo Go on Android
- Expo Go or a development build on iPhone

Note:

- Windows cannot run the iOS Simulator
- iPhone testing from this machine means using a physical device

### Verify the codebase

```bash
cd mobile
npm run typecheck
npm run build:web
```

## GitHub readiness

- root-level `.gitignore` is in place
- line endings are normalized with `.gitattributes`
- repository formatting defaults are defined in `.editorconfig`
- GitHub Actions runs type checking and a web export on push and pull requests

## Branching and release workflow

- `master` is the stable production branch and publishes the GitHub Pages site
- `development` is the integration branch for new features before production
- feature work should branch from `development`
- pull requests into `development` must pass CI before merging
- production updates should go from `development` to `master` only after manual review and successful CI

## Current implementation status

- Expo Router navigation is in place
- GPX import is implemented for file and URL sources
- native map rendering is implemented with `react-native-maps`
- web uses an interactive Leaflet map with OpenStreetMap tiles
- native storage uses `expo-sqlite`
- web uses the shared public JSON feed in read-only mode and local storage in owner/admin mode
- hike details include difficulty, route type, pace, elevation profile, and route dynamics
- the details screen includes an exportable summary poster for saving or sharing
