import { type BadgeSource, type ActiveIndicator, type HoverEffect, type ButtonAction, type ButtonStyle, type DockbarButton, type FooterTool } from "../config.ts";
import { type Scope } from "../storage.ts";

export const SCOPES: { scope: Scope; label: string; hint: string }[] = [
  { scope: "shared", label: "Everyone", hint: "The base config for all users. Admins only." },
  { scope: "user", label: "Just me", hint: "Your changes on top of the shared config, on every device you use." },
  { scope: "device", label: "This device", hint: "Changes for this browser only, e.g. a wall tablet." },
];

export const ACTION_LABELS: Record<ButtonAction, string> = {
  navigate: "Open a dashboard or page",
  url: "Open a link in a new tab",
  toggle_sidebar: "Open Home Assistant menu",
  toggle_header: "Show/hide header",
  settings: "Open Dockbar settings",
  disable: "Turn off Dockbar",
  notifications: "Open notifications",
  section: "Only open its buttons (no page)",
};

export const BADGE_LABELS: Record<BadgeSource, string> = {
  none: "None",
  notifications: "Notifications",
  updates: "Updates",
  repairs: "Repairs",
  config: "Updates + repairs (like HA's Settings)",
};

/** One-click Home Assistant buttons for the Buttons tab. */
export const HA_BUTTONS: { label: string; button: Omit<DockbarButton, "id"> }[] = [
  { label: "Settings", button: { name: "Settings", icon: "mdi:cog", action: "navigate", path: "/config" } },
  { label: "Notifications", button: { name: "Notifications", icon: "mdi:bell", action: "notifications" } },
  { label: "Updates", button: { name: "Updates", icon: "mdi:update", action: "navigate", path: "/config/updates" } },
  { label: "Repairs", button: { name: "Repairs", icon: "mdi:tools", action: "navigate", path: "/config/repairs" } },
  { label: "Profile", button: { name: "Profile", icon: "mdi:account-circle", action: "navigate", path: "/profile" } },
];

export const FOOTER_LABELS: Record<FooterTool, string> = {
  settings: "Settings",
  menu: "HA menu",
  header: "Header",
  off: "Turn off",
};

export const STYLE_LABELS: Record<keyof ButtonStyle, string> = {
  background: "Background",
  border: "Border",
  border_radius: "Corner radius",
  icon_color: "Icon colour",
  name_color: "Name colour",
  icon_size: "Icon size",
  font_size: "Name size",
  state_color: "Live value colour",
  badge_color: "Badge colour",
  shadow: "Shadow",
  text_transform: "Name case",
  letter_spacing: "Letter spacing",
};

export const INDICATOR_LABELS: Record<ActiveIndicator, string> = {
  fill: "Fill (current page's style below)",
  line: "Line on the edge",
  pill: "Pill behind the icon",
  dot: "Dot",
  glow: "Glow",
};
export const HOVER_LABELS: Record<HoverEffect, string> = {
  brighten: "Brighten",
  lift: "Lift",
  grow: "Grow",
  glow: "Glow",
  none: "None",
};
export const SHADOW_CHOICES: [string, string][] = [
  ["none", "None"],
  ["soft", "Soft"],
  ["raised", "Raised"],
  ["glow", "Glow"],
  ["3d", "3D"],
  ["soft-ui", "Soft UI"],
];

export const COLOUR_KEYS: ReadonlySet<string> = new Set(["background", "icon_color", "name_color", "state_color", "badge_color"]);

export function getPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  if (value === undefined || value === "") delete target[last];
  else target[last] = value;
}

export function asHex(v: unknown): string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
}
