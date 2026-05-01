# mobile-app

React Native / Expo / Zustand

## Setup
This folder is intentionally empty — ready for your existing Expo template.

### Steps
```bash
# 1. Copy your Expo template into this folder
#    (all template files should sit here alongside this README)

# 2. Install dependencies
npm install

# 3. Add the anatomy-ai specific packages
npm install zustand

# 4. Copy env
cp ../../.env.example .env
```

---

## Integration points

### Sending a query to the API Gateway
```ts
const response = await fetch(`${API_GATEWAY_URL}/ask`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: userInput }),
});
const { data } = await response.json();
// data = { answer, sources, visualCommand }
```

### Sending a VisualCommand to the WebView
```tsx
import { useRef } from "react";
import WebView from "react-native-webview";

const webViewRef = useRef<WebView>(null);

const sendCommand = (command: VisualCommand) => {
  webViewRef.current?.postMessage(JSON.stringify(command));
};
```

### Direct mode switch (no AI inference)
```ts
const response = await fetch(`${API_GATEWAY_URL}/visual-command`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ region: "brain", mode: "brain" }),
});
const { data } = await response.json();
sendCommand(data); // send command to WebView
```

---

## State shape (Zustand)
```ts
type AnatomyStore = {
  query: string;
  answer: string;
  sources: SourceRef[];
  currentCommand: VisualCommand | null;
  isLoading: boolean;
  setQuery: (q: string) => void;
  submitQuery: () => Promise<void>;
};
```

---

## Recommended folder structure (inside this folder)
```
mobile-app/
├── app/           # Expo Router screens
├── components/    # Shared UI components
├── store/         # Zustand store
├── services/      # API calls to gateway
├── types/         # Shared types
└── constants/     # Colors, endpoints, config
```
