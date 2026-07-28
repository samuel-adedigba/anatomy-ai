import { ScenePlan } from "./scenePlan.generated";

function formatTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)}s`;
}

export function renderScenePlanSteps(plan: ScenePlan): void {
  const panel = document.getElementById("scene-plan-panel");
  const title = document.getElementById("scene-plan-title");
  const status = document.getElementById("scene-plan-status");
  const list = document.getElementById("scene-plan-steps");
  if (!panel || !title || !status || !list) return;

  title.textContent = plan.learning_objective;
  status.textContent = `${formatTime(plan.duration_ms)} · ${plan.steps.length} steps · Animation is not available yet`;
  list.replaceChildren(
    ...plan.steps.map((step) => {
      const item = document.createElement("li");
      const time = document.createElement("span");
      const caption = document.createElement("span");
      time.className = "scene-step-time";
      time.textContent = formatTime(step.start_ms);
      caption.textContent = step.caption;
      item.append(time, caption);
      return item;
    })
  );
  panel.hidden = false;
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
