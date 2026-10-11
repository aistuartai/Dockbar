// Everything that touches Home Assistant's frontend lives here, so HA upgrades only break one file.
import type { Position } from "./config.ts";

export interface HassPanel {
  component_name: string;
  url_path: string;
  title: string | null;
  icon?: string | null;
}

export interface HassLike {
  dockedSidebar?: "docked" | "auto" | "always_hidden";
  user?: { is_admin: boolean; name: string };
  panels: Record<string, HassPanel>;
  states: Record<string, HassEntity>;
  entities?: Record<string, { entity_id: string; platform: string }>;
  connection: {
    sendMessagePromise<T = unknown>(msg: Record<string, unknown>): Promise<T>;
    subscribeMessage<T = unknown>(cb: (msg: T) => void, msg: Record<string, unknown>): Promise<() => void>;
  };
  localize?: (key: string) => string;
  formatEntityState?: (entity: HassEntity, state?: string) => string;
  formatEntityAttributeValue?: (entity: HassEntity, attribute: string, value?: unknown) => string;
}
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}
type HomeAssistantEl = HTMLElement & { hass?: HassLike };

export function hass(): HassLike | undefined {
  return homeAssistant()?.hass;
}

/**
 * An entity's state, or one of its attributes, formatted the way HA shows it
 * (units, translations, number format). Undefined when the entity doesn't exist.
 */
export function entityText(entityId: string, attribute?: string): string | undefined {
  const h = hass();
  const entity = h?.states[entityId];
  if (!h || !entity) return undefined;
  if (attribute) {
    const value = entity.attributes[attribute];
    if (value === undefined) return undefined;
    return h.formatEntityAttributeValue?.(entity, attribute) ?? String(value);
  }
  if (h.formatEntityState) return h.formatEntityState(entity);
  const unit = entity.attributes.unit_of_measurement;
  return unit ? `${entity.state} ${unit}` : entity.state;
}

/** Every entity id, for the editor's suggestions. */
export function entityIds(): string[] {
  return Object.keys(hass()?.states ?? {}).sort();
}

/** The integration's on/off switch, found by platform so a renamed entity still works. */
export function dockbarSwitchState(): "on" | "off" | null {
  const h = hass();
  const entry = Object.values(h?.entities ?? {}).find(
    (e) => e.platform === "dockbar" && e.entity_id.startsWith("switch."),
  );
  const state = entry ? h?.states[entry.entity_id]?.state : undefined;
  return state === "on" || state === "off" ? state : null;
}

/**
 * HA tells open browsers when an integration adds or removes a frontend module.
 * Disabling the Dockbar integration removes ours, so the bar can step aside without a reload.
 */
export function watchOwnModule(onChange: (loaded: boolean) => void) {
  const own = new URL(import.meta.url).pathname;
  hass()
    ?.connection.subscribeMessage<{ change_type: string; item: { url: string } }>(
      (msg) => {
        if (new URL(msg.item.url, location.origin).pathname === own) onChange(msg.change_type === "added");
      },
      { type: "frontend/subscribe_extra_js" },
    )
    .catch(() => {});
}

/** `?dockbar=edit` opens the settings dialog, even if the settings button is hidden. */
export function wantsEditor(): boolean {
  return new URLSearchParams(location.search).get("dockbar") === "edit";
}

export interface NavTarget {
  path: string;
  label: string;
}

/** Every dashboard and view this user can open, for the path picker. */
export async function navTargets(): Promise<NavTarget[]> {
  const h = hass();
  if (!h) return [];
  const out: NavTarget[] = [];
  const panels = Object.values(h.panels).filter((p) => p.url_path && p.title);
  await Promise.all(
    panels.map(async (p) => {
      const title = h.localize?.(`panel.${p.title}`) || p.title!;
      out.push({ path: `/${p.url_path}`, label: title });
      if (p.component_name !== "lovelace") return;
      try {
        const config = await h.connection.sendMessagePromise<{ views?: { path?: string; title?: string }[] }>({
          type: "lovelace/config",
          url_path: p.url_path === "lovelace" ? null : p.url_path,
        });
        config.views?.forEach((v, i) =>
          out.push({ path: `/${p.url_path}/${v.path ?? i}`, label: `${title} › ${v.title ?? v.path ?? i}` }),
        );
      } catch {
        // Strategy or YAML dashboards without a stored config: the dashboard itself is enough.
      }
    }),
  );
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

const SIDES: Position[] = ["left", "right", "top", "bottom"];
const PREV_DOCK_KEY = "dockbar:previous-dock";
const DISABLE_KEY = "dockbar:disabled";

// Always present in hui-root and switched by CSS variables on <html>, so a freshly created
// dashboard never shows its header for a frame before Dockbar catches up.
// The header comes back in edit mode, otherwise there'd be no way to save or exit.
const HEADER_CSS = `
  .header { display: var(--dockbar-header-display, block) !important; }
  .edit-mode .header { display: block !important; }
  hui-view-container:not(.has-tab-bar) {
    padding-top: calc(
      var(--dockbar-header-space, var(--header-height)) + var(--safe-area-inset-top, 0px) +
        var(--view-container-padding-top, 0px)
    ) !important;
  }
`;

export function homeAssistant(): HomeAssistantEl | null {
  return document.querySelector("home-assistant");
}

export async function waitForHass(): Promise<HomeAssistantEl> {
  await customElements.whenDefined("home-assistant");
  for (;;) {
    const el = homeAssistant();
    if (el?.hass) return el;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function fire(target: EventTarget, type: string, detail?: unknown) {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** `?dockbar=off` disables Dockbar for this browser session, `?dockbar=on` re-enables it. */
export function isDisabled(): boolean {
  const flag = new URLSearchParams(location.search).get("dockbar");
  try {
    if (flag === "off") sessionStorage.setItem(DISABLE_KEY, "1");
    if (flag === "on") sessionStorage.removeItem(DISABLE_KEY);
    return sessionStorage.getItem(DISABLE_KEY) === "1";
  } catch {
    return flag === "off";
  }
}

export function navigate(path: string) {
  history.pushState(null, "", path);
  fire(window, "location-changed", { replace: false });
}

/**
 * Reserve room for the bar using the same CSS hook the companion apps use for notches,
 * so every HA page (dashboards, settings, dialogs) lays itself out around the bar.
 */
export function setInset(position: Position | null, px: number) {
  const style = document.documentElement.style;
  for (const side of SIDES) style.removeProperty(`--app-safe-area-inset-${side}`);
  if (position) {
    style.setProperty(
      `--app-safe-area-inset-${position}`,
      `calc(env(safe-area-inset-${position}, 0px) + ${px}px)`,
    );
  }
}

const MAIN_STYLE_ID = "dockbar-main";
const PAD_ATTR = "dockbar-pad";
// HA only honours the left safe-area inset in its narrow (phone) layout or via a docked sidebar.
// With the sidebar hidden on a wide screen nothing pads the left edge, so do it on the drawer.
const MAIN_CSS = `
  :host([${PAD_ATTR}]) {
    --ha-top-app-bar-width: calc(100% - var(--safe-area-inset-left, 0px)) !important;
    --safe-area-content-inset-left: 0px !important;
  }
  :host([${PAD_ATTR}]) ha-drawer {
    box-sizing: border-box;
    padding-inline-start: var(--safe-area-inset-left, 0px);
  }
  /* When the sidebar opens as an overlay it sits above the bar (HA puts it in the top layer),
     so it shouldn't indent its items by the space the bar reserves. Real notch insets stay. */
  :host([modal]) ha-sidebar {
    --safe-area-inset-top: env(safe-area-inset-top, 0px);
    --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-inset-left: env(safe-area-inset-left, 0px);
    --safe-area-inset-right: env(safe-area-inset-right, 0px);
  }
`;

/** Keeps the page clear of a left-hand bar when HA's sidebar is hidden on a wide screen. */
export function syncLeftPad(leftBar: boolean) {
  const main = homeAssistant()?.shadowRoot?.querySelector("home-assistant-main") as
    | (HTMLElement & { narrow?: boolean })
    | null
    | undefined;
  const root = main?.shadowRoot;
  if (!main || !root) return;
  if (!root.getElementById(MAIN_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = MAIN_STYLE_ID;
    style.textContent = MAIN_CSS;
    root.appendChild(style);
  }
  main.toggleAttribute(PAD_ATTR, leftBar && main.hasAttribute("modal") && !main.narrow);
}

/** Uses HA's own "always hidden" sidebar mode and puts the user's previous choice back when turned off. */
export function setSidebarHidden(hidden: boolean) {
  const ha = homeAssistant();
  const current = ha?.hass?.dockedSidebar;
  if (!ha || !current) return;
  const store = storage();
  if (hidden && current !== "always_hidden") {
    store?.setItem(PREV_DOCK_KEY, current);
    fire(ha, "hass-dock-sidebar", { dock: "always_hidden" });
  } else if (!hidden) {
    const prev = store?.getItem(PREV_DOCK_KEY);
    if (prev && current === "always_hidden") fire(ha, "hass-dock-sidebar", { dock: prev });
    store?.removeItem(PREV_DOCK_KEY);
  }
}

/** Opens HA's sidebar as an overlay, or docks/undocks it when it isn't hidden. */
export function toggleSidebar() {
  const main = homeAssistant()?.shadowRoot?.querySelector("home-assistant-main");
  if (main) fire(main, "hass-toggle-menu");
}

function huiRoot(): HTMLElement | null {
  const main = homeAssistant()?.shadowRoot?.querySelector("home-assistant-main");
  const panel =
    main?.shadowRoot?.querySelector("ha-panel-lovelace") ??
    main?.shadowRoot?.querySelector("partial-panel-resolver")?.shadowRoot?.querySelector("ha-panel-lovelace");
  return panel?.shadowRoot?.querySelector("hui-root") ?? null;
}

let headerSheet: CSSStyleSheet | null = null;

/**
 * Adds the header rules to hui-root's own stylesheet list, so every dashboard is created with them.
 * Lit adopts `elementStyles` into each new instance's shadow root.
 */
function patchHuiRoot() {
  if (headerSheet) return;
  headerSheet = new CSSStyleSheet();
  headerSheet.replaceSync(HEADER_CSS);
  customElements.whenDefined("hui-root").then(() => {
    const cls = customElements.get("hui-root") as unknown as { finalize?: () => void; elementStyles?: unknown[] };
    cls.finalize?.();
    if (Array.isArray(cls.elementStyles) && !cls.elementStyles.includes(headerSheet)) {
      cls.elementStyles.push(headerSheet);
    }
  });
}

/** Dashboards only. Settings pages keep their header because it carries the back button. */
export function applyHeaderHidden(hidden: boolean) {
  patchHuiRoot();
  const html = document.documentElement.style;
  if (hidden) {
    html.setProperty("--dockbar-header-display", "none");
    html.setProperty("--dockbar-header-space", "0px");
  } else {
    html.removeProperty("--dockbar-header-display");
    html.removeProperty("--dockbar-header-space");
  }
  // A hui-root created before the patch (the one on screen at page load) gets the sheet directly.
  const root = huiRoot()?.shadowRoot;
  if (root && headerSheet && !root.adoptedStyleSheets.includes(headerSheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, headerSheet];
  }
}
