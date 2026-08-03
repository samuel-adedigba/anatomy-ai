export type TimelineState = "idle" | "playing" | "paused" | "completed";

export type TimelineWindow = {
  id: string;
  start_ms: number;
  duration_ms: number;
};

export type TimelineTrackEvent = {
  type: "track_start" | "track_end";
  track_id: string;
  time_ms: number;
};

export type TimelineCallbacks = {
  onTime?: (timeMs: number) => void;
  onStateChange?: (state: TimelineState) => void;
  onTrackEvent?: (event: TimelineTrackEvent) => void;
  onComplete?: () => void;
};

/**
 * Deterministic clock for a ScenePlan. Rendering is driven from the current
 * time, so pause and seek affect every runtime subsystem together.
 */
export class TimelinePlayer {
  private durationMs = 0;
  private loop = false;
  private timeMs = 0;
  private speed = 1;
  private state: TimelineState = "idle";
  private tracks: TimelineWindow[] = [];
  private activeTrackIds = new Set<string>();
  private callbacks: TimelineCallbacks;

  constructor(callbacks: TimelineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  load(durationMs: number, loop: boolean, tracks: TimelineWindow[]): void {
    this.durationMs = durationMs;
    this.loop = loop;
    this.tracks = tracks;
    this.timeMs = 0;
    this.activeTrackIds.clear();
    this.setState("idle");
    this.emitTime();
  }

  play(): void {
    if (this.durationMs <= 0) return;
    if (this.state === "completed") {
      this.timeMs = 0;
      this.activeTrackIds.clear();
    }
    this.setState("playing");
    this.syncActiveTracks(true);
  }

  pause(): void {
    if (this.state === "playing") this.setState("paused");
  }

  replay(): void {
    if (this.durationMs <= 0) return;
    this.timeMs = 0;
    this.activeTrackIds.clear();
    this.setState("playing");
    this.emitTime();
    this.syncActiveTracks(true);
  }

  seek(timeMs: number): void {
    if (this.durationMs <= 0) return;
    this.timeMs = Math.max(0, Math.min(timeMs, this.durationMs));
    this.activeTrackIds.clear();
    this.emitTime();
    this.syncActiveTracks(false);
    if (this.timeMs >= this.durationMs && !this.loop) {
      this.setState("completed");
    }
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return;
    this.speed = Math.max(0.25, Math.min(speed, 2));
  }

  update(deltaSeconds: number): void {
    if (this.state !== "playing" || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const nextTime = this.timeMs + deltaSeconds * 1000 * this.speed;
    if (nextTime < this.durationMs) {
      this.timeMs = nextTime;
      this.syncActiveTracks(true);
      this.emitTime();
      return;
    }

    this.timeMs = this.durationMs;
    this.syncActiveTracks(true);
    this.emitTime();

    if (this.loop) {
      this.timeMs = 0;
      this.activeTrackIds.clear();
      this.emitTime();
      this.syncActiveTracks(true);
      return;
    }

    this.setState("completed");
    this.callbacks.onComplete?.();
  }

  getTimeMs(): number {
    return this.timeMs;
  }

  getDurationMs(): number {
    return this.durationMs;
  }

  getSpeed(): number {
    return this.speed;
  }

  getState(): TimelineState {
    return this.state;
  }

  private syncActiveTracks(emitEvents: boolean): void {
    const nextActive = new Set(
      this.tracks
        .filter(
          (track) =>
            this.timeMs >= track.start_ms &&
            this.timeMs < track.start_ms + track.duration_ms
        )
        .map((track) => track.id)
    );

    if (emitEvents) {
      this.tracks.forEach((track) => {
        const wasActive = this.activeTrackIds.has(track.id);
        const isActive = nextActive.has(track.id);
        if (!wasActive && isActive) {
          this.callbacks.onTrackEvent?.({
            type: "track_start",
            track_id: track.id,
            time_ms: this.timeMs,
          });
        } else if (wasActive && !isActive) {
          this.callbacks.onTrackEvent?.({
            type: "track_end",
            track_id: track.id,
            time_ms: this.timeMs,
          });
        }
      });
    }

    this.activeTrackIds = nextActive;
  }

  private emitTime(): void {
    this.callbacks.onTime?.(this.timeMs);
  }

  private setState(state: TimelineState): void {
    if (this.state === state) return;
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }
}
