import { load } from "js-yaml";

export type Position = "left" | "right" | "top" | "bottom";
export const POSITIONS: Position[] = ["left", "right", "top", "bottom"];

export type ButtonAction =
  | "navigate"
  | "url"
  | "toggle_sidebar"
  | "toggle_header"
  | "settings"
  | "disable"
  | "notifications"
  | "section";
export const ACTIONS: ButtonAction[] = [
  "navigate",
  "url",
  "toggle_sidebar",
  "toggle_header",
  "settings",
  "disable",
  "notifications",
  "section",
];

/**
 * What a button's count badge shows. "config" is HA's Settings badge (updates + repairs).
 * Left unset, a button that opens Settings or the notifications drawer gets the matching badge.
 */
export type BadgeSource = "none" | "notifications" | "updates" | "repairs" | "config";
export const BADGE_SOURCES: BadgeSource[] = ["none", "notifications", "updates", "repairs", "config"];

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
  /** Colour of the count badge, and of the ring around a button that has one. */
  badge_color?: string;
  /** none, soft, raised, glow, 3d, soft-ui, or any CSS box-shadow. */
  shadow?: string;
  /** e.g. uppercase, for spaced-out labels. */
  text_transform?: string;
  /** e.g. 0.12em */
  letter_spacing?: string;
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
  "badge_color",
  "shadow",
  "text_transform",
  "letter_spacing",
];

/** How the current page's button is marked, on top of its "active" style. */
export type ActiveIndicator = "fill" | "line" | "pill" | "dot" | "glow";
export const ACTIVE_INDICATORS: ActiveIndicator[] = ["fill", "line", "pill", "dot", "glow"];
export type HoverEffect = "brighten" | "lift" | "grow" | "glow" | "none";
export const HOVER_EFFECTS: HoverEffect[] = ["brighten", "lift", "grow", "glow", "none"];

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
  badge?: BadgeSource;
  /** Icon colour while this button shows a count badge; overrides the "alert" style. */
  alert_icon_color?: string;
  /** Puts this button inside another one, which then opens and closes to show it. */
  parent?: string;
}
export const BUTTON_KEYS = ["name", "icon", "action", "path", "url", "hidden", "entity", "attribute", "badge", "parent", "alert_icon_color", ...STYLE_KEYS] as const;

export interface Settings {
  position: Position;
  /** null keeps `position` on small screens. */
  /** Position below mobile_breakpoint: an edge, "hidden" for no bar on phones, or null to keep `position`. */
  mobile_position: Position | "hidden" | null;
  mobile_breakpoint: number;
  /** Bar thickness on phones in px; null uses `size`. */
  mobile_size: number | null;
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
  /** Applied on top while a button shows a count badge. */
  alert: ButtonStyle;
  active_indicator: ActiveIndicator;
  hover_effect: HoverEffect;
  /** Colour of the line, pill, dot or glow that marks the current page, and of hover glows. */
  indicator_color: string;
  /** Looks saved from the editor, by name. Levels add to each other rather than replace. */
  custom_presets: Record<string, SavedLook>;
  footer: FooterTool[];
  /** Pages where the bar is hidden: a dashboard ("/wall-panel") or one view ("/wall-panel/kiosk"). */
  hide_on: string[];
  /** Raw CSS injected into the bar's shadow root. */
  style: string;
}
export type SettingKey = keyof Settings;

/** The settings that make up a "look": what presets set and what Save current look captures. */
export const LOOK_KEYS = [
  "background",
  "background_opacity",
  "backdrop_filter",
  "show_names",
  "active_indicator",
  "indicator_color",
  "hover_effect",
  "defaults",
  "active",
  "alert",
] as const;
export type LookKey = (typeof LOOK_KEYS)[number];
export type SavedLook = Partial<Pick<Settings, LookKey>>;

/** Only the look settings from a layer or config. */
export function pickLook(src: SavedLook): SavedLook {
  return Object.fromEntries(LOOK_KEYS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
}
export const SETTING_KEYS: SettingKey[] = [
  "position",
  "mobile_position",
  "mobile_breakpoint",
  "mobile_size",
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
  "alert",
  "active_indicator",
  "hover_effect",
  "indicator_color",
  "custom_presets",
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
  edits?: Record<string, { [K in keyof Omit<DockbarButton, "id">]?: DockbarButton[K] | null }>;
}

/**
 * One layer of config. Only the fields it changes are present.
 * `buttons` is the base list (YAML or shared layer); `button_overrides` is for user and device layers.
 */
/** Bumped when a saved layer's shape changes, so an older bundle can tell it is looking at newer data. */
export const LAYER_VERSION = 1;

export type Layer = Partial<Settings> & {
  version?: number;
  buttons?: DockbarButton[];
  button_overrides?: ButtonOverrides;
};

export const DEFAULT_SETTINGS: Settings = {
  position: "left",
  mobile_position: "bottom",
  mobile_breakpoint: 600,
  mobile_size: null,
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
  alert: {},
  active_indicator: "fill",
  hover_effect: "brighten",
  indicator_color: "var(--primary-color)",
  custom_presets: {},
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

const URL_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

/** The link as written if it opens a web page, mail or phone link; null for anything else, such as `javascript:`. */
export function safeUrl(url: string): string | null {
  try {
    return URL_SCHEMES.includes(new URL(url, "https://example.invalid/").protocol) ? url : null;
  } catch {
    return null;
  }
}

/** Fields an override may set to null to clear what a lower level gave the button. */
export const CLEARABLE_KEYS = BUTTON_KEYS.filter((k) => k !== "name" && k !== "action");

function sanitiseButtonFields(raw: Record<string, unknown>, warn?: Warn): Partial<Omit<DockbarButton, "id">> {
  const out: Partial<Omit<DockbarButton, "id">> = { ...sanitiseStyle(raw) };
  if (typeof raw.name === "string") out.name = raw.name;
  if (typeof raw.icon === "string") out.icon = raw.icon;
  const path = raw.path ?? raw.navigation_path;
  if (typeof path === "string") out.path = path;
  if (typeof raw.url === "string") {
    const url = safeUrl(raw.url.trim());
    if (url) out.url = url;
    else if (raw.url.trim()) warn?.(`url must start with http:, https:, mailto: or tel:`);
  }
  if (ACTIONS.includes(raw.action as ButtonAction)) out.action = raw.action as ButtonAction;
  else if (raw.action != null) warn?.(`action must be one of ${ACTIONS.join(", ")}`);
  if (typeof raw.hidden === "boolean") out.hidden = raw.hidden;
  if (typeof raw.entity === "string" && raw.entity.includes(".")) out.entity = raw.entity.trim();
  else if (raw.entity != null && raw.entity !== "") warn?.(`entity must look like sensor.name`);
  if (typeof raw.attribute === "string" && raw.attribute) out.attribute = raw.attribute.trim();
  if (BADGE_SOURCES.includes(raw.badge as BadgeSource)) out.badge = raw.badge as BadgeSource;
  else if (raw.badge != null) warn?.(`badge must be one of ${BADGE_SOURCES.join(", ")}`);
  if (typeof raw.parent === "string") out.parent = raw.parent;
  if (typeof raw.alert_icon_color === "string" && raw.alert_icon_color) out.alert_icon_color = raw.alert_icon_color;
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
    const fields = sanitiseButtonFields(item, (m) => warn(`${field}[${i}]: ${m}`));
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
      const fields: Record<string, unknown> = sanitiseButtonFields(e, (m) => warn(`button_overrides.edits.${id}: ${m}`));
      for (const k of CLEARABLE_KEYS) if (e[k] === null) fields[k] = null;
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

/** `min` is 0 for spacing (padding, gap) and 1 for sizes, which can't be zero. */
/** Generous upper bounds, so a stray extra zero doesn't draw a bar wider than the screen. */
const LIMITS: Record<string, number> = {
  mobile_breakpoint: 5000,
  padding: 200,
  gap: 200,
  size: 600,
  mobile_size: 600,
  button_length: 600,
  button_min_length: 600,
};

function num(v: unknown, field: string, warn: Warn, min = 0): number | undefined {
  const n = Number(v);
  const max = LIMITS[field] ?? Infinity;
  if (Number.isFinite(n) && n >= min && n <= max) return n;
  const range = max === Infinity ? (min > 0 ? "a positive number" : "zero or more") : `between ${min} and ${max}`;
  warn(`${field} must be ${range} (got "${v}")`);
  return undefined;
}

const TOP_LEVEL_KEYS = new Set<string>([...SETTING_KEYS, "buttons", "button_overrides", "version"]);

/** Turns untrusted input into a Layer containing only valid fields. */
export function sanitiseLayer(raw: unknown, warn: Warn = () => {}): Layer {
  if (raw === null || raw === undefined) return {};
  if (!isObject(raw)) {
    warn("config must be a mapping");
    return {};
  }
  const out: Layer = {};
  for (const key of Object.keys(raw)) if (!TOP_LEVEL_KEYS.has(key)) warn(`unknown setting "${key}"`);
  const set = <K extends SettingKey>(key: K, value: Settings[K] | undefined) => {
    if (value !== undefined) out[key] = value;
  };
  if (raw.position !== undefined) set("position", position(raw.position, "position", warn));
  if (raw.mobile_position !== undefined) {
    const v = raw.mobile_position;
    set(
      "mobile_position",
      v === null || v === false || v === "none" ? null : v === "hidden" ? "hidden" : position(v, "mobile_position", warn),
    );
  }
  if (raw.mobile_size !== undefined) {
    set("mobile_size", raw.mobile_size === null ? null : num(raw.mobile_size, "mobile_size", warn, 1));
  }
  for (const key of ["mobile_breakpoint", "padding", "gap"] as const) {
    if (raw[key] !== undefined) set(key, num(raw[key], key, warn));
  }
  for (const key of ["size", "button_min_length"] as const) {
    if (raw[key] !== undefined) set(key, num(raw[key], key, warn, 1));
  }
  if (raw.button_length !== undefined) {
    set("button_length", raw.button_length === null ? null : num(raw.button_length, "button_length", warn, 1));
  }
  if (raw.background_opacity !== undefined) {
    const v = raw.background_opacity === null ? null : num(raw.background_opacity, "background_opacity", warn);
    set("background_opacity", v === null || v === undefined ? v : Math.min(100, v));
  }
  for (const key of ["hide_sidebar", "hide_header", "show_names"] as const) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] === "boolean") set(key, raw[key]);
    else if (raw[key] === "true" || raw[key] === "false") set(key, raw[key] === "true");
    else warn(`${key} must be true or false`);
  }
  if (raw.active_indicator !== undefined) {
    if (ACTIVE_INDICATORS.includes(raw.active_indicator as ActiveIndicator)) set("active_indicator", raw.active_indicator as ActiveIndicator);
    else warn(`active_indicator must be one of ${ACTIVE_INDICATORS.join(", ")}`);
  }
  if (raw.hover_effect !== undefined) {
    if (HOVER_EFFECTS.includes(raw.hover_effect as HoverEffect)) set("hover_effect", raw.hover_effect as HoverEffect);
    else warn(`hover_effect must be one of ${HOVER_EFFECTS.join(", ")}`);
  }
  for (const key of ["background", "backdrop_filter", "style", "indicator_color"] as const) {
    if (raw[key] !== undefined && raw[key] !== null) set(key, String(raw[key]));
  }
  if (raw.defaults !== undefined) set("defaults", sanitiseStyle(raw.defaults));
  if (raw.active !== undefined) set("active", sanitiseStyle(raw.active));
  if (raw.alert !== undefined) set("alert", sanitiseStyle(raw.alert));
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
  if (raw.custom_presets !== undefined) {
    if (isObject(raw.custom_presets)) {
      const looks: Record<string, SavedLook> = {};
      for (const [name, look] of Object.entries(raw.custom_presets)) {
        const clean = sanitiseLayer(look, (m) => warn(`custom_presets.${name}: ${m}`));
        const picked = pickLook(clean);
        if (name.trim() && Object.keys(picked).length) looks[name.trim()] = picked;
      }
      set("custom_presets", looks);
    } else warn("custom_presets must be a mapping of names to looks");
  }
  if (typeof raw.version === "number" && Number.isFinite(raw.version)) out.version = raw.version;
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
