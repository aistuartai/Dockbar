// What a button does when it's tapped, apart from navigating: calling a Home Assistant action,
// toggling an entity, or opening its details. Kept free of DOM and HA access so it can be tested.
import type { DockbarButton } from "./config.ts";

export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  target?: { entity_id: string | string[] };
}

/** The action Home Assistant uses to toggle an entity of this kind. */
export function toggleCall(entityId: string, state?: string): ServiceCall {
  const domain = entityId.split(".")[0];
  const target = { entity_id: entityId };
  const call = (d: string, service: string): ServiceCall => ({ domain: d, service, data: {}, target });
  switch (domain) {
    case "lock":
      return call("lock", state === "locked" ? "unlock" : "lock");
    case "cover":
      return call("cover", "toggle");
    case "button":
    case "input_button":
      return call(domain, "press");
    case "scene":
    case "script":
      return call(domain, "turn_on");
    default:
      return call("homeassistant", "toggle");
  }
}

/** The call a "Run a Home Assistant action" button makes, or null if it has no usable action set. */
export function serviceCall(b: DockbarButton): ServiceCall | null {
  const [domain, service] = (b.service ?? "").split(".");
  if (!domain || !service) return null;
  return { domain, service, data: b.data ?? {}, ...(b.target ? { target: { entity_id: b.target } } : {}) };
}

const ACTIVE_STATES = new Set(["on", "open", "opening", "unlocked", "playing", "home", "heat", "cool", "heat_cool", "active"]);

/** Whether an entity's state counts as "on", the way Home Assistant colours its own icons. */
export function isActiveState(state: string | undefined): boolean {
  return state !== undefined && ACTIVE_STATES.has(state);
}

/** What a button still needs before its action can run, or null if nothing. */
export function actionProblem(b: DockbarButton): string | null {
  if (b.action === "perform_action" && !serviceCall(b)) return "Choose the action to run, for example light.turn_on.";
  if ((b.action === "toggle" || b.action === "more_info") && !b.entity) return "Choose an entity under Live value below.";
  return null;
}
