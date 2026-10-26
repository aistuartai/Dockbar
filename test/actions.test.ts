import { test } from "node:test";
import assert from "node:assert/strict";
import { actionProblem, serviceCall, toggleCall } from "../src/actions.ts";
import type { DockbarButton } from "../src/config.ts";

const button = (extra: Partial<DockbarButton>): DockbarButton => ({ id: "b", action: "perform_action", ...extra });

test("toggling picks the action Home Assistant uses for that kind of entity", () => {
  assert.deepEqual(toggleCall("light.kitchen"), { domain: "homeassistant", service: "toggle", data: {}, target: { entity_id: "light.kitchen" } });
  assert.equal(toggleCall("lock.door", "locked").service, "unlock");
  assert.equal(toggleCall("lock.door", "unlocked").service, "lock");
  assert.equal(toggleCall("lock.door").service, "lock");
  assert.deepEqual([toggleCall("cover.garage").domain, toggleCall("cover.garage").service], ["cover", "toggle"]);
  assert.deepEqual([toggleCall("input_button.x").domain, toggleCall("input_button.x").service], ["input_button", "press"]);
  assert.deepEqual([toggleCall("scene.movie").domain, toggleCall("scene.movie").service], ["scene", "turn_on"]);
  assert.deepEqual([toggleCall("script.bedtime").domain, toggleCall("script.bedtime").service], ["script", "turn_on"]);
});

test("an action button becomes a call with its data and target", () => {
  assert.deepEqual(serviceCall(button({ service: "scene.turn_on", target: "scene.movie" })), {
    domain: "scene",
    service: "turn_on",
    data: {},
    target: { entity_id: "scene.movie" },
  });
  assert.deepEqual(serviceCall(button({ service: "light.turn_on", target: ["light.a", "light.b"], data: { brightness_pct: 40 } })), {
    domain: "light",
    service: "turn_on",
    data: { brightness_pct: 40 },
    target: { entity_id: ["light.a", "light.b"] },
  });
  assert.deepEqual(serviceCall(button({ service: "notify.mobile_app" })), { domain: "notify", service: "mobile_app", data: {} });
  assert.equal(serviceCall(button({})), null);
  assert.equal(serviceCall(button({ service: "nodot" })), null);
});

test("a button says what it still needs", () => {
  assert.match(actionProblem(button({}))!, /Choose the action/);
  assert.equal(actionProblem(button({ service: "light.toggle" })), null);
  assert.match(actionProblem(button({ action: "toggle" }))!, /Choose an entity/);
  assert.equal(actionProblem(button({ action: "more_info", entity: "light.a" })), null);
  assert.equal(actionProblem(button({ action: "navigate" })), null);
});
