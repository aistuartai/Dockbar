import { test } from "node:test";
import assert from "node:assert/strict";
import { canOpen, checkHooks, clearDisabled, isDisabled, dashboardPaths, dockbarSwitchState, newDashboardButtons, updatesCount } from "../src/ha.ts";

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
