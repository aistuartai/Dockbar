import { test } from "node:test";
import assert from "node:assert/strict";
import { sidebarButtons, sidebarPanels, type SidebarPanel } from "../src/sidebar.ts";

const panel = (url_path: string, extra: Partial<SidebarPanel> = {}): SidebarPanel => ({
  component_name: "custom",
  url_path,
  title: url_path,
  ...extra,
});
const dash = (url_path: string, title: string) => panel(url_path, { component_name: "lovelace", title, icon: "mdi:star" });

const panels = Object.fromEntries(
  [
    dash("lovelace", "Overview"),
    dash("house", "House"),
    dash("garden", "Garden"),
    panel("energy", { title: "energy" }),
    panel("history", { title: "history" }),
    panel("map", { title: "map" }),
    panel("hacs", { title: "HACS", icon: "hacs:hacs" }),
    panel("todo", { title: "todo", default_visible: false }),
    panel("config", { title: "config" }),
    panel("profile", { title: "profile" }),
    panel("notfound", { title: null }),
    panel("no-title", { title: null }),
    panel("hidden-in-sidebar", { show_in_sidebar: false }),
  ].map((p) => [p.url_path, p]),
);
const localize = (key: string) => ({ "panel.energy": "Energy", "panel.history": "History", "panel.map": "Map" })[key] ?? "";
const base = { panels, localize, defaultPanel: "lovelace", prefs: { panelOrder: [], hiddenPanels: [] } };

test("default order: default dashboard, dashboards A-Z, built-ins, then the rest A-Z", () => {
  assert.deepEqual(
    sidebarPanels(base).map((p) => p.url_path),
    ["lovelace", "garden", "house", "energy", "map", "history", "hacs"],
  );
});

test("the user's own order comes first, and hidden panels stay hidden", () => {
  const prefs = { panelOrder: ["hacs", "house", "todo"], hiddenPanels: ["map", "garden"] };
  assert.deepEqual(
    sidebarPanels({ ...base, prefs }).map((p) => p.url_path),
    ["hacs", "house", "todo", "lovelace", "energy", "history"],
  );
});

test("buttons get titles, icons, paths, then Notifications, Settings and Profile", () => {
  const buttons = sidebarButtons({ ...base, defaultPanel: "house" });
  assert.deepEqual(buttons[0], { id: "house", name: "House", icon: "mdi:star", action: "navigate", path: "/house" });
  const energy = buttons.find((b) => b.path === "/energy");
  assert.equal(energy?.name, "Energy");
  assert.equal(energy?.icon, "mdi:lightning-bolt");
  assert.deepEqual(
    buttons.slice(-3).map((b) => [b.id, b.action, b.path]),
    [
      ["notifications", "notifications", undefined],
      ["settings", "navigate", "/config"],
      ["profile", "navigate", "/profile"],
    ],
  );
  assert.equal(new Set(buttons.map((b) => b.id)).size, buttons.length);
});
