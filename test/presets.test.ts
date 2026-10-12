import { test } from "node:test";
import assert from "node:assert/strict";
import { merge } from "../src/merge.ts";
import { PRESETS, applyPreset } from "../src/presets.ts";

test("a preset changes the look but keeps buttons and their own colours", () => {
  const before = merge([
    { buttons: [{ id: "solar", action: "navigate", path: "/solar", icon_color: "#FFD54F" }], defaults: { background: "#227277" } },
  ]);
  const after = applyPreset(before, PRESETS.neon);
  assert.equal(after.active_indicator, "glow");
  assert.equal(after.defaults.background, "rgba(30, 20, 60, 0.6)");
  assert.deepEqual(after.buttons, before.buttons);
  assert.equal(after.buttons[0].icon_color, "#FFD54F");
});

test("every preset only sets known look settings", () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    assert.equal("buttons" in p.settings, false, key);
    assert.ok(p.settings.active_indicator, key);
  }
});
