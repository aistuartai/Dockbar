import { test } from "node:test";
import assert from "node:assert/strict";
import { findActive, onAnyPath } from "../src/match.ts";
import type { DockbarButton } from "../src/config.ts";

const nav = (path: string): DockbarButton => ({ action: "navigate", path });
const buttons = [
  nav("/dashboard-main/weather-station"),
  nav("/dashboard-solar/main"),
  nav("/dashboard-main/power"),
  nav("/it-systems/proxmox"),
  nav("/dashboard-main/finance"),
  { action: "toggle_sidebar" } as DockbarButton,
];

test("exact path wins", () => assert.equal(findActive(buttons, "/dashboard-main/power"), 2));
test("trailing slash and query ignored", () => assert.equal(findActive(buttons, "/dashboard-main/finance/"), 4));
test("other view of a single-button dashboard", () => assert.equal(findActive(buttons, "/dashboard-solar/battery"), 1));
test("ambiguous dashboard gives no match", () => assert.equal(findActive(buttons, "/dashboard-main/0"), -1));
test("unrelated page gives no match", () => assert.equal(findActive(buttons, "/config/dashboard"), -1));
test("subpath counts as the button", () => assert.equal(findActive(buttons, "/it-systems/proxmox/node1"), 3));

test("hidden buttons are never active", () =>
  assert.equal(findActive([{ id: "h", action: "navigate", path: "/x", hidden: true }], "/x"), -1));

test("hide_on covers a dashboard's views but not lookalike dashboards", () => {
  assert.equal(onAnyPath("/wall-panel/kiosk", ["/wall-panel"]), true);
  assert.equal(onAnyPath("/wall-panel", ["/wall-panel/"]), true);
  assert.equal(onAnyPath("/wall-panel-2/0", ["/wall-panel"]), false);
  assert.equal(onAnyPath("/dashboard-main/0?edit=1", ["/dashboard-main/0"]), true);
  assert.equal(onAnyPath("/anything", []), false);
});
