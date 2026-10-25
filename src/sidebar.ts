// Builds a first-run button list that mirrors Home Assistant's own sidebar.
// Kept free of DOM and HA access so it can be tested; ha.ts supplies the inputs.
import type { DockbarButton } from "./config.ts";
import { slug, uniqueId } from "./config.ts";

export interface SidebarPanel {
  component_name: string;
  url_path: string;
  title: string | null;
  icon?: string | null;
  show_in_sidebar?: boolean;
  default_visible?: boolean;
}

export interface SidebarPrefs {
  panelOrder: string[];
  hiddenPanels: string[];
}

export interface SidebarInput {
  panels: Record<string, SidebarPanel>;
  prefs: SidebarPrefs;
  defaultPanel: string;
  localize: (key: string) => string;
  language?: string;
}

// These live at the bottom of HA's sidebar, so they're added separately at the end.
const BOTTOM = ["profile", "config", "notfound"];
// HA's built-in order for these panels, after the dashboards.
const BUILT_IN_ORDER: Record<string, number> = { energy: 1, map: 2, logbook: 3, history: 4 };
// Built-in panels have no icon of their own; HA draws these.
const BUILT_IN_ICONS: Record<string, string> = {
  calendar: "mdi:calendar",
  energy: "mdi:lightning-bolt",
  history: "mdi:chart-box",
  logbook: "mdi:format-list-bulleted-type",
  map: "mdi:tooltip-account",
  "media-browser": "mdi:play-box-multiple",
  todo: "mdi:clipboard-list",
  home: "mdi:home",
  lovelace: "mdi:view-dashboard",
  "developer-tools": "mdi:hammer",
};

/** The panels HA's sidebar shows, in its order (same rules as ha-sidebar in 2026.10). */
export function sidebarPanels(input: SidebarInput): SidebarPanel[] {
  const { panels, prefs, defaultPanel, language } = input;
  const shown = Object.values(panels).filter(
    (p) =>
      !BOTTOM.includes(p.url_path) &&
      (p.url_path === defaultPanel ||
        (Boolean(p.title) &&
          p.show_in_sidebar !== false &&
          !prefs.hiddenPanels.includes(p.url_path) &&
          (p.default_visible !== false || prefs.panelOrder.includes(p.url_path)))),
  );
  const title = (p: SidebarPanel) => panelTitle(input, p);
  const byTitle = (a: SidebarPanel, b: SidebarPanel) => title(a).localeCompare(title(b), language);
  const ordered = (a: SidebarPanel, b: SidebarPanel) => {
    const ia = prefs.panelOrder.indexOf(a.url_path);
    const ib = prefs.panelOrder.indexOf(b.url_path);
    // Panels the user has ordered come first, in their order.
    if (ia !== ib) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    if (a.url_path === defaultPanel) return -1;
    if (b.url_path === defaultPanel) return 1;
    const la = a.component_name === "lovelace";
    const lb = b.component_name === "lovelace";
    if (la && lb) return byTitle(a, b);
    if (la !== lb) return la ? -1 : 1;
    const oa = BUILT_IN_ORDER[a.url_path];
    const ob = BUILT_IN_ORDER[b.url_path];
    if (oa && ob) return oa - ob;
    if (oa || ob) return oa ? -1 : 1;
    return byTitle(a, b);
  };
  return shown.sort(ordered);
}

export function panelTitle(input: Pick<SidebarInput, "localize">, p: SidebarPanel): string {
  return (p.title && input.localize(`panel.${p.title}`)) || p.title || p.url_path;
}

/** The dashboards HA could list in its sidebar, whatever this user has ordered or hidden there. */
export function dashboardPanels(panels: Record<string, SidebarPanel>): SidebarPanel[] {
  return Object.values(panels).filter(
    (p) => p.component_name === "lovelace" && Boolean(p.title) && p.show_in_sidebar !== false && !BOTTOM.includes(p.url_path),
  );
}

/**
 * Buttons for dashboards that are new: not among the ones seen at the last save, and with no button yet.
 * Ids are made to avoid the ones already in use.
 */
export function newDashboardButtons(
  input: Pick<SidebarInput, "panels" | "localize">,
  buttons: DockbarButton[],
  seen: string[],
): DockbarButton[] {
  const known = new Set(seen);
  const covered = new Set(buttons.map((b) => (b.path ?? "").split(/[?#]/)[0].split("/").filter(Boolean)[0]));
  const taken = new Set(buttons.map((b) => b.id));
  return dashboardPanels(input.panels)
    .filter((p) => !known.has(p.url_path) && !covered.has(p.url_path))
    .sort((a, b) => a.url_path.localeCompare(b.url_path))
    .map((p) => ({
      id: uniqueId(p.url_path, taken),
      name: panelTitle(input, p),
      icon: p.icon || BUILT_IN_ICONS[p.url_path] || "mdi:view-dashboard",
      action: "navigate" as const,
      path: `/${p.url_path}`,
    }));
}

/** HA's sidebar as Dockbar buttons: its panels, then Notifications, Settings and Profile. */
export function sidebarButtons(input: SidebarInput): DockbarButton[] {
  const taken = new Set<string>();
  const id = (wanted: string) => {
    let base = slug(wanted) || "panel";
    let out = base;
    for (let n = 2; taken.has(out); n++) out = `${base}-${n}`;
    taken.add(out);
    return out;
  };
  const buttons: DockbarButton[] = sidebarPanels(input).map((p) => ({
    id: id(p.url_path),
    name: panelTitle(input, p),
    icon: p.icon || BUILT_IN_ICONS[p.url_path] || (p.component_name === "lovelace" ? "mdi:view-dashboard" : "mdi:puzzle"),
    action: "navigate",
    path: `/${p.url_path}`,
  }));
  const label = (key: string, fallback: string) => input.localize(key) || fallback;
  buttons.push(
    { id: id("notifications"), name: label("ui.notification_drawer.title", "Notifications"), icon: "mdi:bell", action: "notifications" },
    { id: id("settings"), name: label("panel.config", "Settings"), icon: "mdi:cog", action: "navigate", path: "/config" },
    { id: id("profile"), name: label("panel.profile", "Profile"), icon: "mdi:account-circle", action: "navigate", path: "/profile" },
  );
  return buttons;
}
