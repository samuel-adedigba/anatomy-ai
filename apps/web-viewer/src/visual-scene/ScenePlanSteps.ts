import { ScenePlan } from "./scenePlan.generated";

export type ScenePlanControls = {
  onTogglePlay: () => void;
  onReplay: () => void;
  onSeek: (timeMs: number) => void;
  onSpeedChange: (speed: number) => void;
};

function formatTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)}s`;
}

export function renderScenePlanSteps(plan: ScenePlan, controls?: ScenePlanControls): void {
  const panel = document.getElementById("scene-plan-panel");
  const title = document.getElementById("scene-plan-title");
  const status = document.getElementById("scene-plan-status");
  const list = document.getElementById("scene-plan-steps");
  if (!panel || !title || !status || !list) return;

  title.textContent = plan.learning_objective;
  status.textContent = `${formatTime(plan.duration_ms)} · ${plan.steps.length} learning steps · Ready to play`;
  list.replaceChildren(
    ...plan.steps.map((step, index) => {
      const item = document.createElement("li");
      const time = document.createElement("span");
      const caption = document.createElement("span");
      item.dataset.stepId = step.id;
      item.dataset.active = index === 0 ? "true" : "false";
      item.setAttribute("aria-current", index === 0 ? "step" : "false");
      time.className = "scene-step-time";
      time.textContent = formatTime(step.start_ms);
      caption.textContent = step.caption;
      item.append(time, caption);
      return item;
    })
  );

  const play = document.getElementById("scene-plan-play") as HTMLButtonElement | null;
  const replay = document.getElementById("scene-plan-replay") as HTMLButtonElement | null;
  const seek = document.getElementById("scene-plan-seek") as HTMLInputElement | null;
  const speed = document.getElementById("scene-plan-speed") as HTMLSelectElement | null;
  if (controls && play && replay && seek && speed) {
    play.onclick = controls.onTogglePlay;
    replay.onclick = controls.onReplay;
    seek.oninput = () => {
      controls.onSeek((Number(seek.value) / 1000) * plan.duration_ms);
    };
    speed.onchange = () => controls.onSpeedChange(Number(speed.value));
    play.disabled = false;
    replay.disabled = false;
    seek.disabled = false;
    speed.disabled = false;
  }
  panel.hidden = false;
}

export function updateScenePlanPlayback(
  plan: ScenePlan,
  timeMs: number,
  state: "idle" | "playing" | "paused" | "completed",
  stepId?: string,
  labels: string[] = []
): void {
  const status = document.getElementById("scene-plan-status");
  const caption = document.getElementById("scene-plan-caption");
  const seek = document.getElementById("scene-plan-seek") as HTMLInputElement | null;
  const play = document.getElementById("scene-plan-play") as HTMLButtonElement | null;
  const labelList = document.getElementById("scene-plan-labels");
  if (!status || !caption || !seek || !play || !labelList) return;

  const activeStep = plan.steps.find((step) => step.id === stepId) ??
    plan.steps.find((step) => timeMs >= step.start_ms && timeMs < step.end_ms);
  status.textContent = `${formatTime(timeMs)} of ${formatTime(plan.duration_ms)} · ${stateLabel(state)}`;
  caption.textContent = activeStep?.caption ?? "The sequence is ready to replay.";
  seek.value = String(Math.round((timeMs / plan.duration_ms) * 1000));
  play.textContent = state === "playing" ? "Pause" : state === "completed" ? "Play again" : "Play";
  document.querySelectorAll<HTMLElement>("#scene-plan-steps li").forEach((item) => {
    const active = item.dataset.stepId === activeStep?.id;
    item.dataset.active = active ? "true" : "false";
    item.setAttribute("aria-current", active ? "step" : "false");
  });
  labelList.replaceChildren(
    ...labels.map((label) => {
      const element = document.createElement("span");
      element.textContent = label;
      return element;
    })
  );
}

export function renderScenePlanFallback(message: string): void {
  const status = document.getElementById("scene-plan-status");
  if (status) status.textContent = message;
  ["scene-plan-play", "scene-plan-replay", "scene-plan-seek", "scene-plan-speed"]
    .map((id) => document.getElementById(id) as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | null)
    .forEach((control) => {
      if (control) control.disabled = true;
    });
}

function stateLabel(state: "idle" | "playing" | "paused" | "completed"): string {
  switch (state) {
    case "playing": return "Playing";
    case "paused": return "Paused";
    case "completed": return "Complete";
    default: return "Ready";
  }
}

export function renderScenePlanError(message: string): void {
  const panel = document.getElementById("scene-plan-panel");
  const title = document.getElementById("scene-plan-title");
  const status = document.getElementById("scene-plan-status");
  const list = document.getElementById("scene-plan-steps");
  if (!panel || !title || !status || !list) return;

  title.textContent = "Scene plan unavailable";
  status.textContent = message;
  list.replaceChildren();
  panel.hidden = false;
}
