import { test } from "node:test";
import assert from "node:assert/strict";
import { merge } from "../src/merge.ts";
import { resetButtons, resetLooks } from "../src/reset.ts";

const base = merge([{ buttons: [{ id: "home", action: "navigate" as const, name: "Home", path: "/lovelace" }], hover_effect: "brighten" }]);
const mine = () =>
  merge([
    {
      buttons: [{ id: "mine", action: "navigate" as const, name: "Mine", path: "/mine", icon_color: "red" }],
      hover_effect: "glow",
      background: "black",
      custom_presets: { Night: { hover_effect: "glow" } },
    },
  ]);

test("reset buttons puts the buttons back and keeps the look and saved looks", () => {
  const working = mine();
  resetButtons(working, base);
  assert.deepEqual(working.buttons.map((b) => b.name), ["Home"]);
  assert.equal(working.hover_effect, "glow");
  assert.equal(working.background, "black");
  assert.ok(working.custom_presets.Night);
});

test("reset look puts the look back and keeps buttons and saved looks", () => {
  const working = mine();
  resetLooks(working, base);
  assert.equal(working.hover_effect, "brighten");
  assert.notEqual(working.background, "black");
  assert.deepEqual(working.buttons.map((b) => b.name), ["Mine"]);
  assert.equal(working.buttons[0].icon_color, "red");
  assert.ok(working.custom_presets.Night);
});

test("a reset copies, so changing the result later leaves the baseline alone", () => {
  const working = mine();
  resetButtons(working, base);
  working.buttons[0].name = "Changed";
  assert.equal(base.buttons[0].name, "Home");
});
