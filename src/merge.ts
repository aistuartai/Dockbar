import {
  BUTTON_KEYS,
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  STYLE_KEYS,
  type ButtonOverrides,
  type ButtonStyle,
  type DockbarButton,
  type DockbarConfig,
  type Layer,
  type SettingKey,
  type Settings,
} from "./config.ts";

export function clone<T>(v: T): T {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** How a setting combines across layers, and the smallest change that gets from one value to another. */
interface KeyRule {
  merge(below: unknown, value: unknown): unknown;
  diff(lower: unknown, working: unknown): unknown;
}

const replace: KeyRule = {
  merge: (_, value) => clone(value),
  diff: (lower, working) => (same(lower, working) ? undefined : clone(working)),
};

/** Styles mix field by field. */
const style: KeyRule = {
  merge: (below, value) => ({ ...(below as ButtonStyle), ...(value as ButtonStyle) }),
  diff: (lower, working) => diffStyle(lower as ButtonStyle, working as ButtonStyle),
};

/** Saved looks add up across levels; a level stores only the looks it adds or changes. */
const looks: KeyRule = {
  merge: (below, value) => ({ ...(below as Settings["custom_presets"]), ...clone(value as Settings["custom_presets"]) }),
  diff: (lower, working) => {
    const below = lower as Settings["custom_presets"];
    const changed = Object.entries(working as Settings["custom_presets"]).filter(([n, l]) => !same(below[n], l));
    return changed.length ? clone(Object.fromEntries(changed)) : undefined;
  },
};

const RULES: Partial<Record<SettingKey, KeyRule>> = { defaults: style, active: style, alert: style, custom_presets: looks };
const rule = (key: SettingKey) => RULES[key] ?? replace;

export function applyOverrides(base: DockbarButton[], o: ButtonOverrides | undefined): DockbarButton[] {
  if (!o) return base;
  let list = [...base, ...(o.added ?? [])];
  if (o.edits) list = list.map((b) => (o.edits![b.id] ? { ...b, ...o.edits![b.id], id: b.id } : b));
  if (o.hidden) list = list.filter((b) => !o.hidden!.includes(b.id));
  if (o.order) {
    // Buttons the override doesn't know about (e.g. newly added to the shared list) go at the end.
    const rank = new Map(o.order.map((id, i) => [id, i]));
    list = list
      .map((b, i) => ({ b, key: rank.get(b.id) ?? o.order!.length + i }))
      .sort((x, y) => x.key - y.key)
      .map((x) => x.b);
  }
  return list;
}

/** Defaults, then each layer in turn. Later layers win field by field. */
export function merge(layers: (Layer | null | undefined)[]): DockbarConfig {
  const out = { ...clone(DEFAULT_SETTINGS), buttons: [] as DockbarButton[] } as DockbarConfig;
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of SETTING_KEYS) {
      const value = layer[key];
      if (value !== undefined) (out as any)[key] = rule(key).merge(out[key], value);
    }
    if (layer.buttons) out.buttons = clone(layer.buttons);
    out.buttons = applyOverrides(out.buttons, layer.button_overrides);
  }
  return out;
}

function diffStyle(lower: ButtonStyle, working: ButtonStyle): ButtonStyle | undefined {
  const out: ButtonStyle = {};
  for (const k of STYLE_KEYS) {
    if (working[k] !== lower[k] && working[k] !== undefined) out[k] = working[k];
  }
  return Object.keys(out).length ? out : undefined;
}

export function diffButtons(lower: DockbarButton[], working: DockbarButton[]): ButtonOverrides | undefined {
  const lowerById = new Map(lower.map((b) => [b.id, b]));
  const workingIds = new Set(working.map((b) => b.id));
  const o: ButtonOverrides = {};

  const added = working.filter((b) => !lowerById.has(b.id));
  if (added.length) o.added = clone(added);

  const hidden = lower.filter((b) => !workingIds.has(b.id)).map((b) => b.id);
  if (hidden.length) o.hidden = hidden;

  const edits: NonNullable<ButtonOverrides["edits"]> = {};
  for (const b of working) {
    const base = lowerById.get(b.id);
    if (!base) continue;
    const e: Record<string, unknown> = {};
    for (const k of BUTTON_KEYS) if (b[k] !== base[k] && b[k] !== undefined) e[k] = b[k];
    if (Object.keys(e).length) edits[b.id] = e;
  }
  if (Object.keys(edits).length) o.edits = edits;

  // Only store an order if the natural one (lower order, added at the end) isn't what's wanted.
  const natural = applyOverrides(lower, { ...o, order: undefined }).map((b) => b.id);
  const wanted = working.map((b) => b.id);
  if (!same(natural, wanted)) o.order = wanted;

  return Object.keys(o).length ? o : undefined;
}

/**
 * The smallest layer that turns `lower` into `working`.
 * The shared layer stores its full button list; user and device layers store overrides.
 */
export function diffLayer(lower: DockbarConfig, working: DockbarConfig, fullButtons: boolean): Layer {
  const layer: Layer = {};
  for (const key of SETTING_KEYS) {
    const d = rule(key).diff(lower[key], working[key]);
    if (d !== undefined) (layer as any)[key] = d;
  }
  if (fullButtons) {
    if (!same(lower.buttons, working.buttons)) layer.buttons = clone(working.buttons);
  } else {
    const o = diffButtons(lower.buttons, working.buttons);
    if (o) layer.button_overrides = o;
  }
  return layer;
}

export function isEmptyLayer(layer: Layer | null | undefined): boolean {
  return !layer || Object.keys(layer).length === 0;
}

export type { Settings };
