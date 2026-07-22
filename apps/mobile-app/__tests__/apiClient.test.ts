/**
 * API client unit tests — mock fetch to avoid real network calls.
 */

import { askQuestion, getVisualCommand, checkHealth } from "../services/apiClient";

// ─── Mock fetch ───────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
;(globalThis as unknown as Record<string, unknown>)["fetch"] = mockFetch;

// Mock expo-constants
jest.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { apiGatewayUrl: "http://localhost:3001" } } },
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok:     status >= 200 && status < 300,
    status,
    json:   () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── askQuestion ─────────────────────────────────────────────────────────────

describe("askQuestion", () => {
  it("returns answer data on success", async () => {
    const mockData = {
      status: true,
      message: "ok",
      data: {
        answer:  "The heart pumps blood.",
        sources: [{ title: "Wikipedia", score: 0.9 }],
        visualCommand: {
          focus_region: "heart",
          view_mode:    "heart",
          highlight:    ["Heart_Mesh"],
          animation:    "pulse",
          confidence:   0.9,
        },
      },
    };
    mockFetch.mockReturnValue(jsonResponse(mockData));
    const result = await askQuestion("What does the heart do?");
    expect(result.answer).toBe("The heart pumps blood.");
    expect(result.visualCommand.view_mode).toBe("heart");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("allows long-running AI requests up to 120 seconds", async () => {
    const timeoutSpy = jest.spyOn(globalThis, "setTimeout");
    mockFetch.mockReturnValue(jsonResponse({
      status: true,
      message: "ok",
      data: {
        answer: "Answer",
        sources: [],
        visualCommand: {
          focus_region: "full_body",
          view_mode: "full_body",
          highlight: [],
          animation: "none",
          confidence: 0.3,
        },
      },
    }));

    await askQuestion("What is anatomy?");

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120_000);
    timeoutSpy.mockRestore();
  });

  it("throws ApiError with code 'server' on 500", async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: "Internal error" }, 500));
    await expect(askQuestion("test")).rejects.toMatchObject({
      code:      "server",
      retryable: true,
    });
  });

  it("throws ApiError with code 'network' on fetch TypeError", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(askQuestion("test")).rejects.toMatchObject({
      code:      "network",
      retryable: true,
    });
  });

  it("throws ApiError with code 'timeout' on AbortError", async () => {
    mockFetch.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    await expect(askQuestion("test")).rejects.toMatchObject({
      code:      "timeout",
      retryable: true,
    });
  });

  it("throws when status=false in response body", async () => {
    mockFetch.mockReturnValue(jsonResponse({ status: false, message: "Bad query" }));
    await expect(askQuestion("test")).rejects.toMatchObject({
      code: "server",
    });
  });
});

// ─── getVisualCommand ─────────────────────────────────────────────────────────

describe("getVisualCommand", () => {
  it("returns a VisualCommand on success", async () => {
    const cmd = {
      focus_region: "brain",
      view_mode:    "brain",
      highlight:    ["Brain_Mesh"],
      animation:    "none",
      confidence:   1,
    };
    mockFetch.mockReturnValue(jsonResponse({ status: true, message: "ok", data: cmd }));
    const result = await getVisualCommand("brain", "brain");
    expect(result.view_mode).toBe("brain");
    expect(result.highlight).toContain("Brain_Mesh");
  });

  it("throws ApiError on server failure", async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: "Oops" }, 503));
    await expect(getVisualCommand("brain", "brain")).rejects.toMatchObject({
      code:      "server",
      retryable: true,
    });
  });
});

// ─── checkHealth ─────────────────────────────────────────────────────────────

describe("checkHealth", () => {
  it("returns online status on success", async () => {
    mockFetch.mockReturnValue(jsonResponse({ status: "online" }));
    const result = await checkHealth();
    expect(result.status).toBe("online");
  });

  it("returns offline when fetch fails", async () => {
    mockFetch.mockRejectedValue(new TypeError("no connection"));
    const result = await checkHealth();
    expect(result.status).toBe("offline");
  });
});
