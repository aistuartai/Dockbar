import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOverrides, diffLayer, merge } from "../src/merge.ts";
import { sanitiseLayer, type DockbarButton } from "../src/config.ts";

const b = (id: string, extra: Partial<DockbarButton> = {}): DockbarButton => ({
  id,
  name: id,
  action: "navigate",
  path: `/${id}`,
  ...extra,
});

test("later layers win field by field, nested styles merge", () => {
  const c = merge([
    { position: "left", defaults: { background: "red", name_color: "blue" } },
    { position: "top", defaults: { background: "green" } },
  ]);
  assert.equal(c.position, "top");
  assert.equal(c.defaults.background, "green");
  assert.equal(c.defaults.name_color, "blue");
  assert.equal(c.defaults.border_radius, "12px"); // built-in default survives
});

test("new shared buttons still appear for a user who reordered", () => {
  const user = { button_overrides: { order: ["c", "a"] } };
  const before = merge([{ buttons: [b("a"), b("b"), b("c")] }, user]).buttons.map((x) => x.id);
  assert.deepEqual(before, ["c", "a", "b"]);
  const after = merge([{ buttons: [b("a"), b("b"), b("c"), b("d")] }, user]).buttons.map((x) => x.id);
  assert.deepEqual(after, ["c", "a", "b", "d"]);
});

test("hidden, added and edited buttons", () => {
  const list = applyOverrides([b("a"), b("b")], {
    hidden: ["a"],
    added: [b("x")],
    edits: { b: { icon_color: "red" } },
  });
  assert.deepEqual(
    list.map((x) => [x.id, x.icon_color]),
    [
      ["b", "red"],
      ["x", undefined],
    ],
  );
});

test("diff then merge round-trips to the working config", () => {
  const shared = { buttons: [b("a"), b("b"), b("c")], position: "left" as const };
  const lower = merge([shared]);
  const working = structuredClone(lower);
  working.position = "bottom";
  working.defaults.background = "pink";
  working.buttons = [b("c", { icon_color: "gold" }), b("a"), b("new")];

  const layer = diffLayer(lower, working, false);
  assert.equal(layer.position, "bottom");
  assert.deepEqual(layer.defaults, { background: "pink" });
  assert.equal(layer.buttons, undefined);
  assert.deepEqual(layer.button_overrides?.hidden, ["b"]);
  assert.deepEqual(layer.button_overrides?.edits, { c: { icon_color: "gold" } });
  assert.deepEqual(merge([shared, layer]), working);
});

test("no changes gives an empty layer", () => {
  const lower = merge([{ buttons: [b("a")] }]);
  assert.deepEqual(diffLayer(lower, structuredClone(lower), false), {});
  assert.deepEqual(diffLayer(lower, structuredClone(lower), true), {});
});

test("sanitise drops bad fields and assigns unique ids", () => {
  const warnings: string[] = [];
  const layer = sanitiseLayer(
    {
      position: "diagonal",
      size: -4,
      mobile_position: "none",
      footer: ["menu", "bogus"],
      buttons: [{ name: "Solar", path: "/s" }, { name: "Solar", path: "/s2" }, { name: "Broken" }],
    },
    (m) => warnings.push(m),
  );
  assert.equal(layer.position, undefined);
  assert.equal(layer.size, undefined);
  assert.equal(layer.mobile_position, null);
  assert.deepEqual(layer.footer, ["menu"]);
  assert.deepEqual(layer.buttons?.map((x) => x.id), ["solar", "solar-2"]);
  assert.equal(warnings.length, 3);
});

test("background opacity is clamped to 0-100 and can be cleared", () => {
  assert.equal(sanitiseLayer({ background_opacity: 150 }).background_opacity, 100);
  assert.equal(sanitiseLayer({ background_opacity: 40 }).background_opacity, 40);
  assert.equal(sanitiseLayer({ background_opacity: null }).background_opacity, null);
  assert.equal(sanitiseLayer({ background_opacity: -5 }, () => {}).background_opacity, undefined);
});

test("a user can hide a shared button and another level can show it again", () => {
  const shared = { buttons: [b("a"), b("b", { hidden: true })] };
  const lower = merge([shared]);
  const working = structuredClone(lower);
  working.buttons = [b("a", { hidden: true }), b("b", { hidden: false })];

  const layer = diffLayer(lower, working, false);
  assert.deepEqual(layer.button_overrides?.edits, { a: { hidden: true }, b: { hidden: false } });
  assert.equal(layer.button_overrides?.hidden, undefined);
  assert.deepEqual(merge([shared, layer]).buttons.map((x) => x.hidden), [true, false]);
  assert.equal(sanitiseLayer({ buttons: [{ path: "/x", hidden: true }] }).buttons?.[0].hidden, true);
});

test("hide_on and live value fields survive sanitising", () => {
  const layer = sanitiseLayer({
    hide_on: ["wall-panel", "/racing/next", "", 5],
    buttons: [{ path: "/s", entity: "sensor.pv_power", attribute: "today", state_color: "#FFD54F" }],
  });
  assert.deepEqual(layer.hide_on, ["/wall-panel", "/racing/next"]);
  assert.equal(layer.buttons?.[0].entity, "sensor.pv_power");
  assert.equal(layer.buttons?.[0].attribute, "today");
  assert.equal(layer.buttons?.[0].state_color, "#FFD54F");
});

test("phone settings: hidden position and a separate thickness", () => {
  assert.equal(sanitiseLayer({ mobile_position: "hidden" }).mobile_position, "hidden");
  assert.equal(sanitiseLayer({ mobile_position: "none" }).mobile_position, null);
  assert.equal(sanitiseLayer({ mobile_position: "sideways" }, () => {}).mobile_position, undefined);
  assert.equal(sanitiseLayer({ mobile_size: 64 }).mobile_size, 64);
  assert.equal(sanitiseLayer({ mobile_size: null }).mobile_size, null);
  assert.equal(merge([{ mobile_size: 64 }, { mobile_size: null }]).mobile_size, null);
});

test("a user can move a shared button out of its section, or into one", () => {
  const shared = { buttons: [b("energy"), b("solar", { parent: "energy" }), b("home")] };
  const lower = merge([shared]);
  const working = structuredClone(lower);
  working.buttons = [b("energy"), b("solar", { parent: "" }), b("home", { parent: "energy" })];

  const layer = diffLayer(lower, working, false);
  assert.deepEqual(layer.button_overrides?.edits, { solar: { parent: "" }, home: { parent: "energy" } });
  const stored = sanitiseLayer(JSON.parse(JSON.stringify(layer)));
  assert.deepEqual(merge([shared, stored]).buttons.map((x) => [x.id, x.parent]), [
    ["energy", undefined],
    ["solar", ""],
    ["home", "energy"],
  ]);
});

test("alert style and per-button alert icon colour survive sanitising and merge", () => {
  const layer = sanitiseLayer({ alert: { icon_color: "#ff5252" }, buttons: [{ path: "/x", alert_icon_color: "orange" }] });
  assert.deepEqual(layer.alert, { icon_color: "#ff5252" });
  assert.equal(layer.buttons?.[0].alert_icon_color, "orange");
  assert.deepEqual(merge([layer, { alert: { border: "1px solid red" } }]).alert, { icon_color: "#ff5252", border: "1px solid red" });
});

test("look settings: indicator, hover and colour are validated", () => {
  const layer = sanitiseLayer(
    { active_indicator: "pill", hover_effect: "grow", indicator_color: "#9C88FF", defaults: { shadow: "soft" } },
    () => {},
  );
  assert.equal(layer.active_indicator, "pill");
  assert.equal(layer.hover_effect, "grow");
  assert.equal(layer.indicator_color, "#9C88FF");
  assert.equal(layer.defaults?.shadow, "soft");
  const bad = sanitiseLayer({ active_indicator: "sparkle", hover_effect: "spin" }, () => {});
  assert.equal(bad.active_indicator, undefined);
  assert.equal(bad.hover_effect, undefined);
});

test("saved looks add up across levels and each level stores only its own", () => {
  const shared = sanitiseLayer({ custom_presets: { Night: { hover_effect: "glow", bogus: 1 } } });
  assert.deepEqual(shared.custom_presets, { Night: { hover_effect: "glow" } });
  const lower = merge([shared]);
  const working = structuredClone(lower);
  working.custom_presets = { ...working.custom_presets, Day: { hover_effect: "lift" } };
  const layer = diffLayer(lower, working, false);
  assert.deepEqual(layer.custom_presets, { Day: { hover_effect: "lift" } });
  assert.deepEqual(Object.keys(merge([shared, layer]).custom_presets), ["Night", "Day"]);
});

test("sizes must be above zero, spacing can be zero", () => {
  const warnings: string[] = [];
  const layer = sanitiseLayer({ size: 0, button_min_length: 0, padding: 0, gap: 0 }, (m) => warnings.push(m));
  assert.equal(layer.size, undefined);
  assert.equal(layer.button_min_length, undefined);
  assert.equal(layer.padding, 0);
  assert.equal(layer.gap, 0);
  assert.equal(warnings.length, 2);
});

test("the example config loads without warnings", async () => {
  const { readFileSync } = await import("node:fs");
  const { load } = await import("js-yaml");
  const warnings: string[] = [];
  const layer = sanitiseLayer(load(readFileSync("examples/config.yaml", "utf8")), (m) => warnings.push(m));
  assert.deepEqual(warnings, []);
  assert.ok(layer.custom_presets?.Night);
  assert.equal(layer.buttons?.find((b) => b.name === "Repairs")?.hidden, true);
});

test("javascript: and other non-web links are dropped from url buttons", () => {
  const warnings: string[] = [];
  const layer = sanitiseLayer(
    { buttons: [{ name: "Bad", action: "url", url: "javascript:alert(1)" }, { name: "Ok", url: "https://example.com" }, { name: "Mail", url: "mailto:a@b.c" }] },
    (m) => warnings.push(m),
  );
  assert.deepEqual(layer.buttons?.map((x) => x.name), ["Ok", "Mail"]);
  assert.equal(warnings.length, 2, "a warning for the dropped link, and one for the button left with no url");
});

test("a button added below wins over a same-id button added above", () => {
  const out = applyOverrides([b("weather", { name: "Shared" })], { added: [b("weather", { name: "Mine" }), b("mine")] });
  assert.deepEqual(out.map((x) => x.name), ["Shared", "mine"]);
});

test("a level can clear a field that a lower level set", () => {
  const lower = [b("solar", { entity: "sensor.solar", badge: "updates" })];
  const working = [b("solar")];
  const overrides = diffLayer({ ...merge([]), buttons: lower }, { ...merge([]), buttons: working }, false).button_overrides;
  assert.deepEqual(overrides?.edits?.solar, { entity: null, badge: null });
  const saved = sanitiseLayer({ button_overrides: JSON.parse(JSON.stringify(overrides)) }).button_overrides;
  assert.deepEqual(applyOverrides(lower, saved), working);
});

test("quoted booleans are read as written, and anything else is rejected", () => {
  const warnings: string[] = [];
  const layer = sanitiseLayer({ hide_sidebar: "false", hide_header: "yes", show_names: true }, (m) => warnings.push(m));
  assert.equal(layer.hide_sidebar, false);
  assert.equal(layer.hide_header, undefined);
  assert.equal(layer.show_names, true);
  assert.equal(warnings.length, 1);
});

test("typos and out-of-range values are warned about, not silently dropped", () => {
  const warnings: string[] = [];
  const layer = sanitiseLayer(
    {
      postion: "left",
      size: 5000,
      padding: 20,
      buttons: [{ name: "A", path: "/a", action: "navigat", entity: "nodot", badge: "lots" }],
    },
    (m) => warnings.push(m),
  );
  assert.equal(layer.size, undefined);
  assert.equal(layer.padding, 20);
  assert.equal(warnings.length, 5);
  assert.ok(warnings.some((w) => w.includes('unknown setting "postion"')));
  assert.ok(warnings.some((w) => w.includes("size must be between 1 and 600")));
});

test("auto-add settings are read, validated and off by default", () => {
  assert.equal(merge([]).auto_add_dashboards, false);
  assert.deepEqual(merge([]).seen_panels, []);
  const warnings: string[] = [];
  const layer = sanitiseLayer({ auto_add_dashboards: true, seen_panels: ["a", 3, "", "b"] }, (m) => warnings.push(m));
  assert.equal(layer.auto_add_dashboards, true);
  assert.deepEqual(layer.seen_panels, ["a", "b"]);
  assert.equal(warnings.length, 0);
  assert.equal(sanitiseLayer({ seen_panels: "a" }, (m) => warnings.push(m)).seen_panels, undefined);
  assert.equal(warnings.length, 1);
});

test("action buttons are read, checked and tidied", () => {
  const warnings: string[] = [];
  const layer = sanitiseLayer(
    {
      buttons: [
        { name: "Movie", service: "scene.turn_on", target: "scene.movie" },
        { name: "Lights", action: "perform_action", service: "light.turn_on", target: ["light.a", "light.b"], data: { brightness_pct: 40 }, confirm: true },
        { name: "Garage", action: "toggle", entity: "cover.garage", confirm: true },
        { name: "Door", action: "more_info", entity: "lock.door" },
        { name: "Bad service", action: "perform_action", service: "nodot" },
        { name: "No entity", action: "toggle" },
        { name: "Bad target", service: "light.turn_on", target: ["light.a", "nonsense"], data: "x" },
      ],
    },
    (m) => warnings.push(m),
  );
  assert.deepEqual(
    layer.buttons?.map((x) => [x.name, x.action]),
    [
      ["Movie", "perform_action"],
      ["Lights", "perform_action"],
      ["Garage", "toggle"],
      ["Door", "more_info"],
      ["Bad target", "perform_action"],
    ],
  );
  assert.deepEqual(layer.buttons?.[1].data, { brightness_pct: 40 });
  assert.equal(layer.buttons?.[1].confirm, true);
  assert.deepEqual(layer.buttons?.[4].target, ["light.a"]);
  assert.equal(layer.buttons?.[4].data, undefined);
  assert.ok(warnings.some((w) => w.includes("service must look like")));
  assert.ok(warnings.some((w) => w.includes("needs an entity")));
  assert.ok(warnings.some((w) => w.includes("target must be")));
  assert.ok(warnings.some((w) => w.includes("data must be a mapping")));
});

test("unchanged action data isn't stored as an edit, and a changed one is", () => {
  const lower = [b("lights", { action: "perform_action", service: "light.turn_on", target: ["light.a"], data: { brightness_pct: 40 } })];
  const copy = JSON.parse(JSON.stringify(lower));
  const full = (buttons: DockbarButton[]) => ({ ...merge([]), buttons });
  assert.equal(diffLayer(full(lower), full(copy), false).button_overrides, undefined);
  copy[0].data = { brightness_pct: 80 };
  assert.deepEqual(diffLayer(full(lower), full(copy), false).button_overrides?.edits?.lights, { data: { brightness_pct: 80 } });
});

test("a button can hide its live value and set an on colour", () => {
  const layer = sanitiseLayer({
    buttons: [{ name: "Lounge", action: "toggle", entity: "light.lounge", on_icon_color: "#FFD54F", show_value: false }],
  });
  assert.equal(layer.buttons?.[0].show_value, false);
  assert.equal(layer.buttons?.[0].on_icon_color, "#FFD54F");
  const lower = [b("lounge", { entity: "light.lounge", show_value: false })];
  const working = [b("lounge", { entity: "light.lounge", show_value: true })];
  const full = (buttons: DockbarButton[]) => ({ ...merge([]), buttons });
  assert.deepEqual(diffLayer(full(lower), full(working), false).button_overrides?.edits?.lounge, { show_value: true });
});
