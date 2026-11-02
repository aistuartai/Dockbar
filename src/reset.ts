import { pickLook, type DockbarConfig } from "./config.ts";
import { clone } from "./merge.ts";
import { groupOrder } from "./sections.ts";

/** The button list back to `base`. The look and saved looks are left alone. */
export function resetButtons(working: DockbarConfig, base: DockbarConfig) {
  working.buttons = groupOrder(clone(base.buttons));
}

/** The look settings back to `base`. Buttons and saved looks (`custom_presets`) are left alone. */
export function resetLooks(working: DockbarConfig, base: DockbarConfig) {
  Object.assign(working, clone(pickLook(base)));
}
