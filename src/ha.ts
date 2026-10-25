// Everything that touches Home Assistant's frontend lives here, so HA upgrades only break one file.
import type { DockbarButton, Position } from "./config.ts";
import { dashboardPanels, newDashboardButtons as buildNewDashboardButtons, sidebarButtons, type SidebarPrefs } from "./sidebar.ts";
import { local } from "./storage.ts";

export interface HassPanel {
  component_name: string;
  url_path: string;
  title: string | null;
  icon?: string | null;
  show_in_sidebar?: boolean;
  default_visible?: boolean;
}

export interface HassLike {
  dockedSidebar?: "docked" | "auto" | "always_hidden";
  user?: { is_admin: boolean; name: string };
  panels: Record<string, HassPanel>;
  states: Record<string, HassEntity>;
  entities?: Record<string, { entity_id: string; platform: string; hidden?: boolean }>;
  connection: {
    sendMessagePromise<T = unknown>(msg: Record<string, unknown>): Promise<T>;
    subscribeMessage<T = unknown>(cb: (msg: T) => void, msg: Record<string, unknown>): Promise<() => void>;
    subscribeEvents(cb: (event: unknown) => void, eventType: string): Promise<() => void>;
  };
  localize?: (key: string) => string;
  userData?: { default_panel?: string } | null;
  systemData?: { default_panel?: string } | null;
  locale?: { language?: string };
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

/** HA's frontend storage: "system" is shared by everyone (admins write), "user" follows the user. */
export type FrontendDataScope = "system" | "user";
export interface FrontendData {
  /** Calls back with the stored value now and on every change. */
  subscribe(scope: FrontendDataScope, onValue: (value: unknown) => void): Promise<unknown>;
  set(scope: FrontendDataScope, value: unknown): Promise<unknown>;
}

/** One key in HA's frontend storage. Call after `waitForHass`. */
export function frontendData(key: string): FrontendData {
  const conn = hass()!.connection;
  return {
    subscribe: (scope, onValue) =>
      conn.subscribeMessage<{ value: unknown }>((msg) => onValue(msg.value), { type: `frontend/subscribe_${scope}_data`, key }),
    set: (scope, value) => conn.sendMessagePromise({ type: `frontend/set_${scope}_data`, key, value }),
  };
}

/** Runs on every page change: HA's own navigation, and the browser's back and forward. */
export function onRouteChange(cb: () => void) {
  window.addEventListener("location-changed", cb);
  window.addEventListener("popstate", cb);
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

let switchId: string | undefined;
let switchSeen = false;

/** The integration's on/off switch, found by platform so a renamed entity still works. */
export function dockbarSwitchState(): "on" | "off" | null {
  const h = hass();
  // Remember the entity once found; scanning every entity on each poll is wasted work.
  if (!switchId || !h?.entities?.[switchId]) {
    switchId = Object.values(h?.entities ?? {}).find(
      (e) => e.platform === "dockbar" && e.entity_id.startsWith("switch."),
    )?.entity_id;
  }
  const state = switchId ? h?.states[switchId]?.state : undefined;
  if (state === "on" || state === "off") {
    switchSeen = true;
    return state;
  }
  // The switch was there and its state has gone: the integration was disabled or removed.
  return switchSeen && switchId ? "off" : null;
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
    .catch((err) =>
      console.warn("Dockbar: can't watch for the integration being disabled, so disabling it needs a page reload", err),
    );
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

/** The user's sidebar order and hidden panels, where HA keeps them (user data, then this browser). */
export async function sidebarPrefs(): Promise<SidebarPrefs> {
  const h = hass();
  let value: Partial<SidebarPrefs> | null = null;
  try {
    value = (await h?.connection.sendMessagePromise<{ value: Partial<SidebarPrefs> | null }>({
      type: "frontend/get_user_data",
      key: "sidebar",
    }))?.value ?? null;
  } catch {
    // Older or restricted setups: fall back to what this browser remembers.
  }
  const local = (key: string): string[] => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  };
  return {
    panelOrder: value?.panelOrder ?? local("sidebarPanelOrder"),
    hiddenPanels: value?.hiddenPanels ?? local("sidebarHiddenPanels"),
  };
}

/** The dashboard HA opens by default, worked out the way HA does. */
function defaultPanel(h: HassLike): string {
  let stored: string | null = null;
  try {
    stored = JSON.parse(localStorage.getItem("defaultPanel") ?? "null");
  } catch {
    // Ignore a damaged value.
  }
  const panel = h.userData?.default_panel || h.systemData?.default_panel || stored || "home";
  return panel === "lovelace" && !h.panels.lovelace ? "home" : panel;
}

/** First-run buttons: this user's HA sidebar, then Notifications, Settings and Profile. */
export function sidebarDefaults(prefs: SidebarPrefs): DockbarButton[] {
  const h = hass();
  if (!h || !Object.keys(h.panels ?? {}).length) return [];
  return sidebarButtons({
    panels: h.panels,
    prefs,
    defaultPanel: defaultPanel(h),
    localize: (key) => h.localize?.(key) ?? "",
    language: h.locale?.language,
  });
}

/** Url paths of the dashboards this user has, sorted. */
export function dashboardPaths(): string[] {
  const h = hass();
  return h ? dashboardPanels(h.panels ?? {}).map((p) => p.url_path).sort() : [];
}

/** Buttons for dashboards created since `seen` was recorded, that `buttons` doesn't already cover. */
export function newDashboardButtons(buttons: DockbarButton[], seen: string[]): DockbarButton[] {
  const h = hass();
  if (!h || !Object.keys(h.panels ?? {}).length) return [];
  return buildNewDashboardButtons({ panels: h.panels, localize: (key) => h.localize?.(key) ?? "" }, buttons, seen);
}

/**
 * Things Dockbar reaches into Home Assistant for that a HA update could move or rename.
 * Empty when everything is where it was expected. Call a few seconds after load so HA has rendered.
 */
export function checkHooks(): string[] {
  const h = hass();
  if (!h) return ["the hass object"];
  const problems: string[] = [];
  const missing = (what: string) => problems.push(what);
  if (typeof h.connection?.subscribeMessage !== "function" || typeof h.connection?.sendMessagePromise !== "function") {
    missing("the websocket connection (hass.connection)");
  }
  if (!h.panels || typeof h.panels !== "object") missing("the panel list (hass.panels)");
  if (!h.entities) missing("the entity registry (hass.entities), so the Dockbar switch can't be found");
  if (typeof h.formatEntityState !== "function") missing("hass.formatEntityState, so live values show raw states");
  const main = homeAssistant()?.shadowRoot?.querySelector("home-assistant-main");
  if (!main) missing("<home-assistant-main>, so the sidebar and notification buttons won't work");
  else if (main.shadowRoot && !main.shadowRoot.querySelector("ha-drawer")) missing("<ha-drawer>, so a left bar may overlap the page");
  const onDashboard = h.panels?.[location.pathname.split("/")[1]]?.component_name === "lovelace";
  if (onDashboard && !huiRoot()) missing("<hui-root>, so hiding the dashboard header won't work");
  return problems;
}

/**
 * Whether this user can open a path. HA only sends each user the panels they're allowed,
 * so a button for an admin-only page (Settings, HACS) is left out for everyone else.
 */
export function canOpen(path: string): boolean {
  const panels = hass()?.panels;
  if (!panels || !Object.keys(panels).length) return true;
  const first = path.split(/[?#]/)[0].split("/").filter(Boolean)[0];
  return !first || first in panels;
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
  /* The page is padded clear of a left bar from outside hui-root, so stretch a scrolling view
     background back under the bar; otherwise a see-through bar shows HA's plain base colour. */
  hui-view-background:not([fixed-background]) {
    left: calc(-1 * var(--dockbar-pad-left, 0px)) !important;
    width: auto !important;
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

/** Forgets a `?dockbar=off` from earlier in this browser session. */
export function clearDisabled() {
  try {
    sessionStorage.removeItem(DISABLE_KEY);
  } catch {
    // No session storage: there is nothing to forget.
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
  const pad = leftBar && main.hasAttribute("modal") && !main.narrow;
  main.toggleAttribute(PAD_ATTR, pad);
  // Read by the hui-root sheet, which stretches the view background under the bar.
  document.documentElement.style.setProperty("--dockbar-pad-left", pad ? "var(--app-safe-area-inset-left, 0px)" : "0px");
}

/** Uses HA's own "always hidden" sidebar mode and puts the user's previous choice back when turned off. */
export function setSidebarHidden(hidden: boolean) {
  const ha = homeAssistant();
  const current = ha?.hass?.dockedSidebar;
  if (!ha || !current) return;
  const store = local();
  if (hidden && current !== "always_hidden") {
    store?.setItem(PREV_DOCK_KEY, current);
    fire(ha, "hass-dock-sidebar", { dock: "always_hidden" });
  } else if (!hidden) {
    const prev = store?.getItem(PREV_DOCK_KEY);
    if (prev && current === "always_hidden") fire(ha, "hass-dock-sidebar", { dock: prev });
    store?.removeItem(PREV_DOCK_KEY);
  }
}

/** Opens HA's notifications drawer, the same as the bell in its sidebar. */
export function showNotifications() {
  const main = homeAssistant()?.shadowRoot?.querySelector("home-assistant-main");
  if (main) fire(main, "hass-show-notifications");
}

/**
 * Pending updates, counted the way HA's Settings badge counts them:
 * update entities that are on, can be installed, and aren't hidden.
 */
export function updatesCount(): number {
  const h = hass();
  if (!h) return 0;
  let n = 0;
  for (const [id, s] of Object.entries(h.states)) {
    if (!id.startsWith("update.") || s.state !== "on" || h.entities?.[id]?.hidden) continue;
    if (Number(s.attributes.supported_features ?? 0) & 1) n++;
  }
  return n;
}

/** Live count of persistent notifications (HA's bell). */
export function watchNotifications(onCount: (n: number) => void) {
  const ids = new Set<string>();
  hass()
    ?.connection.subscribeMessage<{ type: string; notifications: Record<string, unknown> }>(
      (msg) => {
        if (msg.type === "current") ids.clear();
        for (const id of Object.keys(msg.notifications ?? {})) {
          if (msg.type === "removed") ids.delete(id);
          else ids.add(id);
        }
        onCount(ids.size);
      },
      { type: "persistent_notification/subscribe" },
    )
    .catch(() => {});
}

/** Live count of repairs that aren't ignored. Admin only, the same as HA's Settings badge. */
export function watchRepairs(onCount: (n: number) => void) {
  const h = hass();
  if (!h?.user?.is_admin) return;
  const load = () =>
    h.connection
      .sendMessagePromise<{ issues: { ignored: boolean }[] }>({ type: "repairs/list_issues" })
      .then((r) => onCount(r.issues.filter((i) => !i.ignored).length))
      .catch(() => {});
  load();
  h.connection.subscribeEvents(() => load(), "repairs_issue_registry_updated").catch(() => {});
}

/** Opens HA's sidebar as an overlay when it's hidden, or collapses and expands it when it's docked. */
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
