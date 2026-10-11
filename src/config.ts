import { load } from "js-yaml";

export type Position = "left" | "right" | "top" | "bottom";
export const POSITIONS: Position[] = ["left", "right", "top", "bottom"];

export type ButtonAction =
  | "navigate"
  | "url"
  | "toggle_sidebar"
  | "toggle_header"
  | "settings"
  | "disable";
export const ACTIONS: ButtonAction[] = [
  "navigate",
  "url",
  "toggle_sidebar",
  "toggle_header",
  "settings",
  "disable",
];

/** Built-in buttons pinned to the end of the bar. */
export type FooterTool = "settings" | "menu" | "header" | "off";
export const FOOTER_TOOLS: FooterTool[] = ["settings", "menu", "header", "off"];

export interface ButtonStyle {
  background?: string;
  border?: string;
  border_radius?: string;
  icon_color?: string;
  name_color?: string;
  icon_size?: string;
  font_size?: string;
  /** Colour of the live entity value. */
  state_color?: string;
}
export const STYLE_KEYS: (keyof ButtonStyle)[] = [
  "background",
  "border",
  "border_radius",
  "icon_color",
  "name_color",
  "icon_size",
  "font_size",
  "state_color",
];

export interface DockbarButton extends ButtonStyle {
  /** Stable id, so user and device overrides survive the shared list changing. */
  id: string;
  name?: string;
  icon?: string;
  action: ButtonAction;
  path?: string;
  url?: string;
  /** Kept in the list but not shown on the bar. */
  hidden?: boolean;
  /** Shows this entity's live state (or one of its attributes) on the button. */
  entity?: string;
  attribute?: string;
}
export const BUTTON_KEYS = ["name", "icon", "action", "path", "url", "hidden", "entity", "attribute", ...STYLE_KEYS] as const;

export interface Settings {
  position: Position;
  /** null keeps `position` on small screens. */
  mobile_position: Position | null;
  mobile_breakpoint: number;
  hide_sidebar: boolean;
  hide_header: boolean;
  /** Bar thickness in px. */
  size: number;
  padding: number;
  gap: number;
  /** Preferred button length along the bar in px; null gives square buttons. */
  button_length: number | null;
  /** Buttons shrink to fit the screen down to this length, then the bar scrolls. */
  button_min_length: number;
  background: string;
  /** 0-100, scales the background colour's own opacity; null leaves it as written. */
  background_opacity: number | null;
  backdrop_filter: string;
  show_names: boolean;
  defaults: ButtonStyle;
  active: ButtonStyle;
  footer: FooterTool[];
  /** Pages where the bar is hidden: a dashboard ("/wall-panel") or one view ("/wall-panel/kiosk"). */
  hide_on: string[];
  /** Raw CSS injected into the bar's shadow root. */
  style: string;
}
export type SettingKey = keyof Settings;
export const SETTING_KEYS: SettingKey[] = [
  "position",
  "mobile_position",
  "mobile_breakpoint",
  "hide_sidebar",
  "hide_header",
  "size",
  "padding",
  "gap",
  "button_length",
  "button_min_length",
  "background",
  "background_opacity",
  "backdrop_filter",
  "show_names",
  "defaults",
  "active",
  "footer",
  "hide_on",
  "style",
];

export interface DockbarConfig extends Settings {
  buttons: DockbarButton[];
}

/** How a user or device changes the button list without copying it. */
export interface ButtonOverrides {
  order?: string[];
  hidden?: string[];
  added?: DockbarButton[];
  edits?: Record<string, Partial<Omit<DockbarButton, "id">>>;
}

/**
 * One layer of config. Only the fields it changes are present.
 * `buttons` is the base list (YAML or shared layer); `button_overrides` is for user and device layers.
 */
export type Layer = Partial<Settings> & {
  buttons?: DockbarButton[];
  button_overrides?: ButtonOverrides;
};

export const DEFAULT_SETTINGS: Settings = {
  position: "left",
  mobile_position: "bottom",
  mobile_breakpoint: 600,
  hide_sidebar: false,
  hide_header: false,
  size: 88,
  padding: 8,
  gap: 8,
  button_length: null,
  button_min_length: 52,
  background: "var(--sidebar-background-color, var(--card-background-color))",
  background_opacity: null,
  backdrop_filter: "blur(8px)",
  show_names: true,
  defaults: {
    background: "var(--secondary-background-color)",
    border: "1px solid transparent",
    border_radius: "12px",
    icon_color: "var(--primary-text-color)",
    name_color: "var(--primary-text-color)",
    icon_size: "28px",
    font_size: "11px",
  },
  active: {
    border: "1px solid var(--primary-color)",
  },
  footer: [...FOOTER_TOOLS],
  hide_on: [],
  style: "",
};

// ---------------------------------------------------------------------------
// Sanitising. Layers come from YAML, HA storage or localStorage; bad fields are
// dropped with a warning rather than taking the whole bar down.

export class ConfigError extends Error {}

type Warn = (msg: string) => void;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sanitiseStyle(src: unknown): ButtonStyle {
  const out: ButtonStyle = {};
  if (!isObject(src)) return out;
  for (const key of STYLE_KEYS) {
    if (src[key] !== undefined && src[key] !== null && src[key] !== "") out[key] = String(src[key]);
  }
  return out;
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "button"
  );
}

export function uniqueId(base: string, taken: Set<string>): string {
  let id = slug(base);
  for (let n = 2; taken.has(id); n++) id = `${slug(base)}-${n}`;
  taken.add(id);
  return id;
}

function sanitiseButtonFields(raw: Record<string, unknown>): Partial<Omit<DockbarButton, "id">> {
  const out: Partial<Omit<DockbarButton, "id">> = { ...sanitiseStyle(raw) };
  if (typeof raw.name === "string") out.name = raw.name;
  if (typeof raw.icon === "string") out.icon = raw.icon;
  const path = raw.path ?? raw.navigation_path;
  if (typeof path === "string") out.path = path;
  if (typeof raw.url === "string") out.url = raw.url;
  if (ACTIONS.includes(raw.action as ButtonAction)) out.action = raw.action as ButtonAction;
  if (typeof raw.hidden === "boolean") out.hidden = raw.hidden;
  if (typeof raw.entity === "string" && raw.entity.includes(".")) out.entity = raw.entity.trim();
  if (typeof raw.attribute === "string" && raw.attribute) out.attribute = raw.attribute.trim();
  return out;
}

function sanitiseButtons(raw: unknown, field: string, warn: Warn, taken = new Set<string>()): DockbarButton[] {
  if (!Array.isArray(raw)) {
    warn(`${field} must be a list`);
    return [];
  }
  const out: DockbarButton[] = [];
  raw.forEach((item, i) => {
    if (!isObject(item)) return warn(`${field}[${i}] must be a mapping`);
    const fields = sanitiseButtonFields(item);
    const action = fields.action ?? (fields.url ? "url" : "navigate");
    if (action === "navigate" && !fields.path) return warn(`${field}[${i}] needs a path`);
    if (action === "url" && !fields.url) return warn(`${field}[${i}] needs a url`);
    const wanted = typeof item.id === "string" && item.id ? item.id : (fields.name ?? fields.path ?? action);
    const id = typeof item.id === "string" && item.id && !taken.has(item.id) ? item.id : uniqueId(wanted, taken);
    taken.add(id);
    out.push({ ...fields, id, action });
  });
  return out;
}

function sanitiseOverrides(raw: unknown, warn: Warn): ButtonOverrides | undefined {
  if (!isObject(raw)) return undefined;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined);
  const out: ButtonOverrides = {};
  const order = strings(raw.order);
  const hidden = strings(raw.hidden);
  if (order?.length) out.order = order;
  if (hidden?.length) out.hidden = hidden;
  if (raw.added !== undefined) {
    const added = sanitiseButtons(raw.added, "button_overrides.added", warn);
    if (added.length) out.added = added;
  }
  if (isObject(raw.edits)) {
    const edits: ButtonOverrides["edits"] = {};
    for (const [id, e] of Object.entries(raw.edits)) {
      if (!isObject(e)) continue;
      const fields = sanitiseButtonFields(e);
      if (Object.keys(fields).length) edits[id] = fields;
    }
    if (Object.keys(edits).length) out.edits = edits;
  }
  return Object.keys(out).length ? out : undefined;
}

function position(v: unknown, field: string, warn: Warn): Position | undefined {
  if (POSITIONS.includes(v as Position)) return v as Position;
  warn(`${field} must be one of ${POSITIONS.join(", ")} (got "${v}")`);
  return undefined;
}

function num(v: unknown, field: string, warn: Warn): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0) return n;
  warn(`${field} must be a positive number (got "${v}")`);
  return undefined;
}

/** Turns untrusted input into a Layer containing only valid fields. */
export function sanitiseLayer(raw: unknown, warn: Warn = () => {}): Layer {
  if (raw === null || raw === undefined) return {};
  if (!isObject(raw)) {
    warn("config must be a mapping");
    return {};
  }
  const out: Layer = {};
  const set = <K extends SettingKey>(key: K, value: Settings[K] | undefined) => {
    if (value !== undefined) out[key] = value;
  };
  if (raw.position !== undefined) set("position", position(raw.position, "position", warn));
  if (raw.mobile_position !== undefined) {
    const v = raw.mobile_position;
    set("mobile_position", v === null || v === false || v === "none" ? null : position(v, "mobile_position", warn));
  }
  for (const key of ["mobile_breakpoint", "size", "padding", "gap", "button_min_length"] as const) {
    if (raw[key] !== undefined) set(key, num(raw[key], key, warn));
  }
  if (raw.button_length !== undefined) {
    set("button_length", raw.button_length === null ? null : num(raw.button_length, "button_length", warn));
  }
  if (raw.background_opacity !== undefined) {
    const v = raw.background_opacity === null ? null : num(raw.background_opacity, "background_opacity", warn);
    set("background_opacity", v === null || v === undefined ? v : Math.min(100, v));
  }
  for (const key of ["hide_sidebar", "hide_header", "show_names"] as const) {
    if (raw[key] !== undefined) set(key, Boolean(raw[key]));
  }
  for (const key of ["background", "backdrop_filter", "style"] as const) {
    if (raw[key] !== undefined && raw[key] !== null) set(key, String(raw[key]));
  }
  if (raw.defaults !== undefined) set("defaults", sanitiseStyle(raw.defaults));
  if (raw.active !== undefined) set("active", sanitiseStyle(raw.active));
  if (raw.footer !== undefined) {
    if (Array.isArray(raw.footer)) {
      set("footer", raw.footer.filter((t): t is FooterTool => FOOTER_TOOLS.includes(t as FooterTool)));
    } else warn("footer must be a list");
  }
  if (raw.hide_on !== undefined) {
    if (Array.isArray(raw.hide_on)) {
      set(
        "hide_on",
        raw.hide_on
          .filter((p): p is string => typeof p === "string" && p.trim() !== "")
          .map((p) => (p.trim().startsWith("/") ? p.trim() : "/" + p.trim())),
      );
    } else warn("hide_on must be a list of paths");
  }
  if (raw.buttons !== undefined) out.buttons = sanitiseButtons(raw.buttons, "buttons", warn);
  const overrides = sanitiseOverrides(raw.button_overrides, warn);
  if (overrides) out.button_overrides = overrides;
  return out;
}

/** Reads the optional YAML file. A missing file is normal (null); a broken one throws ConfigError. */
export async function loadYamlLayer(url: string, warn: Warn): Promise<Layer | null> {
  const bust = `${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const res = await fetch(url + bust, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new ConfigError(`could not load ${url} (HTTP ${res.status})`);
  let raw: unknown;
  try {
    raw = load(await res.text());
  } catch (err) {
    throw new ConfigError(`${url} is not valid YAML: ${(err as Error).message}`);
  }
  return sanitiseLayer(raw, (m) => warn(`${url}: ${m}`));
}
