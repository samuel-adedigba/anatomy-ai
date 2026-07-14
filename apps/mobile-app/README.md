# Anatomy AI — Mobile App

React Native + Expo mobile application for the Anatomy AI system.

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android emulator, or the Expo Go app on a physical device

---

## Installation

```bash
cd apps/mobile-app
pnpm install
```

---

## Environment variables

Create a `.env` file (or `app.config.ts` extra fields) with:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001       # API Gateway URL
EXPO_PUBLIC_VIEWER_URL=http://localhost:5173    # Web Viewer URL
```

For physical device testing, replace `localhost` with your machine's local IP address (for example, `http://192.168.1.42:3001` for the gateway and `http://192.168.1.42:5173` for the viewer). Android emulators use `10.0.2.2` to reach the host machine.

These variables are read in:
- `services/apiClient.ts` → `EXPO_PUBLIC_API_URL`
- `components/organisms/AnatomyViewer.tsx` → `EXPO_PUBLIC_VIEWER_URL`

**Never commit production URLs or secrets to source control.**

---

## Running

```bash
# Start Expo development server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

The app requires the following services to be running locally:

| Service             | Default URL             | Required for          |
|---------------------|-------------------------|-----------------------|
| API Gateway         | `http://localhost:3001` | Question answering    |
| Web Viewer (Vite)   | `http://localhost:5173` | 3D anatomy rendering  |
| Instruction Engine  | `http://localhost:3002` | Visual commands       |
| AI Service          | `http://localhost:8001` | RAG answers           |

---

## Running against local services

1. Start the web viewer: `cd apps/web-viewer && pnpm dev`
2. Start the API gateway: `cd services/api-gateway && pnpm dev`
3. Start the AI service: `cd services/ai-service && python main.py`
4. Start Expo: `cd apps/mobile-app && pnpm start`

If any backend service is unavailable, the app degrades gracefully:
- Health check shows "Offline" in the header
- Question submission shows a retryable error
- The 3D viewer still loads for manual exploration

---

## Architecture

```
app/
  _layout.tsx          Root layout — providers, status bar, splash screen
  index.tsx            Main workspace screen

components/
  atoms/               Smallest primitives: Text, Chip, IconButton
  molecules/           Composed UI: AppHeader, QueryInput, SystemSelector,
                       ViewerControls, SourceCard
  organisms/           Feature components: AnatomyViewer, AnswerPanel,
                       ErrorCard, OnboardingOverlay

constants/
  theme.ts             All design tokens: Colors, Spacing, Radius, FontSize
  anatomy.ts           Body systems config, suggested questions

hooks/                 Custom React hooks (extend as needed)

services/
  apiClient.ts         All HTTP calls to the API gateway — centralised here

store/
  useAnatomyStore.ts   Zustand store: query, answer, sources, visual command,
                       view mode, loading, error, health, onboarding

types/
  viewer.ts            VisualCommand, ViewMode, CameraAction, message protocol
  api.ts               AskRequest/Response, VisualCommandResponse, ApiError
```

---

## API contract

### POST /ask

```json
Request:  { "query": "What does the heart do?", "sessionId": "optional" }
Response: {
  "status": true,
  "message": "Query processed",
  "data": {
    "answer": "The heart is a muscular organ...",
    "sources": [{ "title": "...", "url": "...", "snippet": "...", "score": 0.9 }],
    "visualCommand": {
      "focus_region": "heart",
      "view_mode": "heart",
      "highlight": ["Heart_Mesh"],
      "animation": "pulse",
      "camera": "zoom_in",
      "confidence": 0.85
    }
  }
}
```

### POST /visual-command

```json
Request:  { "region": "brain", "mode": "brain" }
Response: {
  "status": true,
  "message": "Visual command generated",
  "data": { "focus_region": "brain", "view_mode": "brain", "highlight": ["Brain_Mesh"],
            "animation": "none", "camera": "reset", "confidence": 1 }
}
```

### GET /health

```json
Response: { "status": "online", "service": "api-gateway", "uptime": 123.4 }
```

---

## WebView message bridge

The mobile app communicates with the Three.js viewer via `postMessage`.

**Mobile → Viewer:** Send a `VisualCommand` JSON string.

```ts
webViewRef.current.postMessage(JSON.stringify(visualCommand));
```

**Viewer → Mobile:** The viewer sends typed status messages:

```ts
type ViewerToMobileMessage =
  | { type: "viewer_ready" }
  | { type: "model_loading"; view_mode: ViewMode }
  | { type: "model_loaded";  view_mode: ViewMode }
  | { type: "viewer_error";  message: string; view_mode?: ViewMode }
  | { type: "command_complete"; view_mode: ViewMode };
```

The `AnatomyViewer` organism handles all of this internally. The store is updated through the callbacks passed to it.

---

## State management

All application state lives in `store/useAnatomyStore.ts` (Zustand).

Persisted to AsyncStorage:
- `onboardingDismissed` (boolean)
- `lastViewMode` (ViewMode)

Not persisted (session-only):
- Query text
- Answer and sources
- Error state
- Visual command
- Viewer readiness
- Service health

---

## Testing

```bash
pnpm test             # run all tests
pnpm test --coverage  # with coverage report
```

Test files are in `__tests__/`:

| File                      | Covers                                             |
|---------------------------|----------------------------------------------------|
| `apiClient.test.ts`       | HTTP success, 500 errors, network failure, timeout |
| `store.test.ts`           | State transitions: query, answer, system select    |
| `visualCommand.test.ts`   | Command validation, message parsing, confidence    |

---

## TypeScript

```bash
pnpm type-check
```

---

## Production build

```bash
npx eas build --platform ios     # requires EAS account
npx eas build --platform android
```

For local builds without EAS:

```bash
npx expo run:ios     # builds and opens in Xcode
npx expo run:android # builds and opens in Android Studio
```

---

## Known limitations

- The web viewer must be reachable at `EXPO_PUBLIC_VIEWER_URL`. On a physical device this must be a local IP or deployed URL, not `localhost`.
- Models `skeleton.glb` and `spine.glb` are missing from the asset set. Switching to those systems shows a placeholder.
- The WebView does not perform `event.origin` validation (acceptable for local bridge, review for web deployment).
- `full_body.glb` (141 MB) causes slow initial load on the "Full Body" system. Optimise the asset before production.
- The app requires React Native 0.74 and Expo 51. Check Expo compatibility before upgrading.
