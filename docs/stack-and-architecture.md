# Stack and architecture

## Product goal

Hiking Map is a local-first hiking journal for your own completed routes. The app needs to run on:

- iOS
- Android
- web

The first version does not require sign-in or cloud sync.

## Final technical direction

The recommended stack for this project is:

- `Expo`
- `React Native`
- `TypeScript`

Supporting packages in the first working version:

- `expo-router` for navigation
- `react-native-maps` for native map rendering
- `leaflet` for the interactive web map
- `expo-document-picker` for GPX file picking
- `expo-file-system` for file reading
- `expo-linking` for shared-link support
- `expo-sqlite` for native local persistence
- `expo-media-library` for saving summary images on device
- `expo-sharing` for native sharing
- `react-native-view-shot` for native poster capture
- `html-to-image` for browser poster export
- `fast-xml-parser` for GPX parsing

## Why not separate native apps

Two fully separate native codebases would slow down the product unnecessarily at this stage. The main requirements do not justify that overhead yet:

- one owner-friendly route collection
- no authentication
- no real-time sync
- no heavy background processing

Expo keeps the implementation lean while still being valid for App Store and Play Store distribution.

## Mapping approach

The current implementation intentionally uses a split map approach:

- `react-native-maps` on iOS and Android
- `Leaflet + OpenStreetMap` in the browser

This keeps the map interactive everywhere while preserving a straightforward native mobile stack.

## Current storage approach

The first working version is intentionally pragmatic:

- native platforms use `expo-sqlite`
- web uses `localStorage`

This split avoids depending on experimental web SQLite setup just to get the first usable browser version online. The data model is intentionally simple so it can be unified later if needed.

## Screens

### Home

Responsibilities:

- import a GPX file
- import a hike from a direct GPX URL
- show the current selected route preview
- show the saved hike list

### Hike details

Responsibilities:

- show the selected route on an interactive map
- show distance, elevation gain, descent, duration, pace, and timestamps
- show derived difficulty and route type
- show an elevation profile and route dynamics chart
- show an exportable summary poster image
- show the original source value

## Data shape

Each stored hike contains:

- `id`
- `title`
- `sourceType`
- `sourceValue`
- `distanceMeters`
- `elevationGainMeters`
- `durationSeconds`
- `startedAt`
- `createdAt`
- `bounds`
- `points`

Each point contains:

- `latitude`
- `longitude`
- `elevationMeters`
- `recordedAt`

## Derived insight layer

Each stored hike is also transformed into a lightweight insight model for the detail screen:

- difficulty estimate from distance, ascent, and duration
- route type as loop or point-to-point
- pace when timestamps are available
- elevation loss, minimum elevation, and maximum elevation
- sampled elevation profile
- route dynamics split into flat, rolling, climb, and descent segments
- recorded month highlight

## GPX import pipeline

The first version parses standard GPX track data and falls back to route points when needed.

Import flow:

1. select a file or provide a direct GPX URL
2. read the XML payload
3. parse GPX data
4. extract route points
5. calculate distance, elevation gain, and duration
6. persist the result locally
7. update the route list and preview

## Web-specific note

Direct URL import can fail in the browser if the remote server does not allow CORS for GPX downloads. That is a browser limitation, not an app logic issue, so the UI calls it out explicitly.

## Windows native build note

On Windows, Expo native autolinking may resolve the real filesystem path behind a junction. Because of that, a junction alone is not always enough when the original repository path contains spaces or non-ASCII characters. For reliable Android builds, keep the real repository in a simple ASCII path.

## Export note

The app exports a purpose-built hike summary poster instead of trying to rasterize a live slippy map. That makes image output much more stable across native and web environments.

## Next implementation milestones

1. improve the hike list with filtering and sorting controls
2. add delete and edit metadata actions
3. support more GPX variants and validation feedback
4. prepare branded store assets and final bundle identifiers
5. add release configuration for App Store and Play Store distribution
6. evaluate optional cloud sync only after the local-first flow is solid
