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
