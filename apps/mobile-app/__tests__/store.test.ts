/**
 * Zustand store unit tests.
 * Tests cover state transitions for query, answer, error, and system selection.
 */

import { useAnatomyStore } from "../store/useAnatomyStore";
import * as apiClient from "../services/apiClient";

// Mock async-storage so store hydration doesn't fail
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem:  jest.fn(() => Promise.resolve(null)),
  setItem:  jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock expo-constants
jest.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { apiGatewayUrl: "http://localhost:3001" } } },
}));

jest.mock("../services/apiClient", () => {
  const actual = jest.requireActual("../services/apiClient");
  return {
    ...actual,
    askQuestion: jest.fn(),
    getVisualCommand: jest.fn(),
    checkHealth: jest.fn(),
  };
});
const mockAsk = apiClient.askQuestion as jest.MockedFunction<typeof apiClient.askQuestion>;
const mockCmd = apiClient.getVisualCommand as jest.MockedFunction<typeof apiClient.getVisualCommand>;
const mockHealth = apiClient.checkHealth as jest.MockedFunction<typeof apiClient.checkHealth>;

const baseVisualCmd = {
  focus_region: "heart",
  view_mode:    "heart" as const,
  highlight:    ["Heart_Mesh"],
  animation:    "pulse" as const,
  confidence:   0.85,
};

beforeEach(() => {
  // Reset store to initial state between tests
  useAnatomyStore.setState({
    query:     "",
    answer:    "",
    sources:   [],
    isLoading: false,
    error:     null,
    hasAsked:  false,
    currentCommand: null,
    currentMode:    "full_body",
    pendingCommand: null,
    viewerReady:    false,
    viewerLoading:  false,
    serviceHealth:  "offline",
    onboardingDismissed: false,
    sessionId: "test-session",
  });
  jest.clearAllMocks();
});

// ─── setQuery ─────────────────────────────────────────────────────────────────

describe("setQuery", () => {
  it("updates query and clears error", () => {
    useAnatomyStore.setState({ error: { code: "network", message: "x", retryable: true } });
    useAnatomyStore.getState().setQuery("What does the heart do?");
    const { query, error } = useAnatomyStore.getState();
    expect(query).toBe("What does the heart do?");
    expect(error).toBeNull();
  });
});

// ─── submitQuery ──────────────────────────────────────────────────────────────

describe("submitQuery", () => {
  it("populates the answer and queues its command until the viewer is ready", async () => {
    useAnatomyStore.setState({ query: "What is the heart?" });
    mockAsk.mockResolvedValue({
      answer:        "The heart pumps blood.",
      sources:       [{ title: "Source A", score: 0.9 }],
      visualCommand: baseVisualCmd,
    });

    const promise = useAnatomyStore.getState().submitQuery();
    expect(useAnatomyStore.getState().isLoading).toBe(true);

    await promise;
    const state = useAnatomyStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.answer).toBe("The heart pumps blood.");
    expect(state.hasAsked).toBe(true);
    expect(state.currentCommand).toBeNull();
    expect(state.pendingCommand?.view_mode).toBe("heart");
    expect(state.error).toBeNull();

    useAnatomyStore.getState().setViewerReady(true);
    expect(useAnatomyStore.getState().currentCommand?.view_mode).toBe("heart");
    expect(useAnatomyStore.getState().pendingCommand).toBeNull();
  });

  it("sets error and clears loading on API failure", async () => {
    useAnatomyStore.setState({ query: "broken query" });
    const apiErr = { code: "network" as const, message: "No connection", retryable: true };
    mockAsk.mockRejectedValue(apiErr);

    await useAnatomyStore.getState().submitQuery();
    const state = useAnatomyStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error?.code).toBe("network");
    expect(state.hasAsked).toBe(false);
  });

  it("does nothing when query is empty", async () => {
    useAnatomyStore.setState({ query: "   " });
    await useAnatomyStore.getState().submitQuery();
    expect(mockAsk).not.toHaveBeenCalled();
  });
});

// ─── selectSystem ─────────────────────────────────────────────────────────────

describe("selectSystem", () => {
  it("updates currentMode and currentCommand on success", async () => {
    const brainCmd = { ...baseVisualCmd, focus_region: "brain", view_mode: "brain" as const };
    mockCmd.mockResolvedValue(brainCmd);
    useAnatomyStore.setState({ viewerReady: true });

    await useAnatomyStore.getState().selectSystem("brain");
    const state = useAnatomyStore.getState();
    expect(state.currentMode).toBe("brain");
    expect(state.currentCommand?.view_mode).toBe("brain");
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets error on failure", async () => {
    mockCmd.mockRejectedValue({ code: "server", message: "fail", retryable: true });
    await useAnatomyStore.getState().selectSystem("brain");
    expect(useAnatomyStore.getState().error).not.toBeNull();
  });
});

// ─── clearAnswer ─────────────────────────────────────────────────────────────

describe("clearAnswer", () => {
  it("resets answer, sources, hasAsked, and error", () => {
    useAnatomyStore.setState({
      answer:   "some answer",
      sources:  [{ title: "S" }],
      hasAsked: true,
      error:    { code: "network", message: "x", retryable: true },
    });
    useAnatomyStore.getState().clearAnswer();
    const { answer, sources, hasAsked, error } = useAnatomyStore.getState();
    expect(answer).toBe("");
    expect(sources).toHaveLength(0);
    expect(hasAsked).toBe(false);
    expect(error).toBeNull();
  });
});

// ─── refreshHealth ────────────────────────────────────────────────────────────

describe("refreshHealth", () => {
  it("sets serviceHealth to online", async () => {
    mockHealth.mockResolvedValue({ status: "online" });
    await useAnatomyStore.getState().refreshHealth();
    expect(useAnatomyStore.getState().serviceHealth).toBe("online");
  });

  it("sets serviceHealth to offline on failure", async () => {
    mockHealth.mockResolvedValue({ status: "offline" });
    await useAnatomyStore.getState().refreshHealth();
    expect(useAnatomyStore.getState().serviceHealth).toBe("offline");
  });
});
