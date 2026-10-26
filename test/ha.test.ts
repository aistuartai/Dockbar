import { test } from "node:test";
import assert from "node:assert/strict";
import { callService, canOpen, checkHooks, clearDisabled, entityState, isDisabled, moreInfo, notify, serviceOptions, dashboardPaths, dockbarSwitchState, newDashboardButtons, updatesCount } from "../src/ha.ts";

type Fake = Record<string, any>;

/** Puts a fake <home-assistant> element on the page, with whatever `hass` the test wants. */
function withHass(hass: Fake | undefined, shadow: Fake = {}) {
  (globalThis as any).document = {
    querySelector: (sel: string) => (sel === "home-assistant" ? { hass, shadowRoot: shadow.root ?? null } : null),
  };
  (globalThis as any).location = { pathname: shadow.path ?? "/" };
}

const switchEntity = { entity_id: "switch.dockbar", platform: "dockbar" };
const base = (extra: Fake = {}) => ({
  connection: { subscribeMessage() {}, sendMessagePromise() {} },
  panels: {},
  states: {},
  entities: {},
  formatEntityState: () => "",
  callService: async () => {},
  ...extra,
});

test("the Dockbar switch is found by platform, and its state read", () => {
  withHass(base({ entities: { "switch.dockbar": switchEntity, "switch.other": { entity_id: "switch.other", platform: "x" } }, states: {} }));
  assert.equal(dockbarSwitchState(), null, "unknown until its state arrives");

  withHass(base({ entities: { "switch.dockbar": switchEntity }, states: { "switch.dockbar": { state: "on" } } }));
  assert.equal(dockbarSwitchState(), "on");
  withHass(base({ entities: { "switch.dockbar": switchEntity }, states: { "switch.dockbar": { state: "off" } } }));
  assert.equal(dockbarSwitchState(), "off");
});

test("a switch that was there and has lost its state means the integration was disabled", () => {
  withHass(base({ entities: { "switch.dockbar": switchEntity }, states: {} }));
  assert.equal(dockbarSwitchState(), "off");
});

test("an unavailable or unknown switch (HA restarting) doesn't hide the bar", () => {
  for (const state of ["unavailable", "unknown"]) {
    withHass(base({ entities: { "switch.dockbar": switchEntity }, states: { "switch.dockbar": { state } } }));
    assert.equal(dockbarSwitchState(), null);
  }
});

test("update badges count update entities that are on, installable and not hidden", () => {
  const update = (state: string, features: number) => ({ state, attributes: { supported_features: features } });
  withHass(
    base({
      states: {
        "update.core": update("on", 1),
        "update.addon": update("on", 0),
        "update.off": update("off", 1),
        "update.hidden": update("on", 1),
        "sensor.x": update("on", 1),
      },
      entities: { "update.hidden": { entity_id: "update.hidden", platform: "x", hidden: true } },
    }),
  );
  assert.equal(updatesCount(), 1);
});

test("a path is openable when HA sent this user that panel", () => {
  withHass(base({ panels: { lovelace: {}, energy: {} } }));
  assert.equal(canOpen("/energy/usage"), true);
  assert.equal(canOpen("/config/updates"), false);
  assert.equal(canOpen("/"), true);
  withHass(base({ panels: {} }));
  assert.equal(canOpen("/config"), true, "no panel list yet: don't hide anything");
});

test("new dashboards come from this user's panels", () => {
  const panels = {
    lovelace: { component_name: "lovelace", url_path: "lovelace", title: "Overview" },
    garden: { component_name: "lovelace", url_path: "garden", title: "Garden", icon: "mdi:flower" },
    hacs: { component_name: "custom", url_path: "hacs", title: "HACS" },
  };
  withHass(base({ panels, localize: () => "" }));
  assert.deepEqual(dashboardPaths(), ["garden", "lovelace"]);
  assert.deepEqual(newDashboardButtons([], ["lovelace"]).map((b) => b.path), ["/garden"]);
  assert.deepEqual(newDashboardButtons([], ["lovelace", "garden"]), []);
  withHass(undefined);
  assert.deepEqual(dashboardPaths(), []);
  assert.deepEqual(newDashboardButtons([], []), []);
});

test("the hook check names what Home Assistant no longer provides", () => {
  const main = { shadowRoot: { querySelector: (s: string) => (s === "ha-drawer" ? {} : null) } };
  const root = { querySelector: (s: string) => (s === "home-assistant-main" ? main : null) };
  withHass(base(), { root });
  assert.deepEqual(checkHooks(), []);

  withHass(base({ entities: undefined, formatEntityState: undefined }), { root });
  assert.equal(checkHooks().length, 2);

  withHass(base(), { root: { querySelector: () => null } });
  assert.match(checkHooks().join(" "), /home-assistant-main/);

  withHass(base({ panels: { "dashboard-main": { component_name: "lovelace" } } }), { root, path: "/dashboard-main/0" });
  assert.match(checkHooks().join(" "), /hui-root/);

  withHass(undefined);
  assert.deepEqual(checkHooks(), ["the hass object"]);
});

test("a ?dockbar=off from earlier in the session can be forgotten", () => {
  const items = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  };
  (globalThis as any).location = { search: "?dockbar=off" };
  assert.equal(isDisabled(), true);
  (globalThis as any).location = { search: "" };
  assert.equal(isDisabled(), true, "stays off on later pages");
  clearDisabled();
  assert.equal(isDisabled(), false);
  (globalThis as any).location = { search: "?dockbar=off" };
  assert.equal(isDisabled(), true);
  (globalThis as any).location = { search: "?dockbar=on" };
  assert.equal(isDisabled(), false, "?dockbar=on still turns it back on");
});

test("a missing callService is named by the hook check", () => {
  const main = { shadowRoot: { querySelector: (s: string) => (s === "ha-drawer" ? {} : null) } };
  const root = { querySelector: (s: string) => (s === "home-assistant-main" ? main : null) };
  withHass(base({ callService: undefined }), { root });
  assert.match(checkHooks().join(" "), /callService/);
});

test("actions go to Home Assistant as the signed-in user", async () => {
  const calls: unknown[][] = [];
  withHass(base({ callService: async (...args: unknown[]) => void calls.push(args), states: { "lock.door": { state: "locked" } } }));
  await callService({ domain: "light", service: "turn_on", data: { brightness_pct: 40 }, target: { entity_id: "light.kitchen" } });
  assert.deepEqual(calls, [["light", "turn_on", { brightness_pct: 40 }, { entity_id: "light.kitchen" }]]);
  assert.equal(entityState("lock.door"), "locked");
  assert.equal(entityState("lock.nope"), undefined);
  withHass(base({ callService: undefined }));
  await assert.rejects(callService({ domain: "light", service: "turn_on", data: {} }), /isn't ready/);
});

test("more-info and notifications are fired as events on the page", () => {
  const events: { type: string; detail: any }[] = [];
  const target = { dispatchEvent: (e: any) => void events.push({ type: e.type, detail: e.detail }) };
  (globalThis as any).CustomEvent = class {
    type: string;
    detail: unknown;
    constructor(type: string, init: { detail: unknown }) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  (globalThis as any).document = { querySelector: () => ({ hass: base(), ...target, shadowRoot: { querySelector: () => target } }) };
  moreInfo("light.kitchen");
  notify("Garage: it failed");
  assert.deepEqual(events, [
    { type: "hass-more-info", detail: { entityId: "light.kitchen" } },
    { type: "hass-notification", detail: { message: "Garage: it failed" } },
  ]);
});

test("the editor's action suggestions come from the services Home Assistant offers", () => {
  withHass(base({ services: { light: { turn_on: { name: "Turn on" }, toggle: {} }, scene: { turn_on: {} } } }));
  assert.deepEqual(serviceOptions(), [
    { value: "light.toggle", label: undefined },
    { value: "light.turn_on", label: "Turn on" },
    { value: "scene.turn_on", label: undefined },
  ]);
  withHass(undefined);
  assert.deepEqual(serviceOptions(), []);
});
