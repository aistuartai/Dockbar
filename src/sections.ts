// Sections: a button can sit inside another button (one level deep) by naming it as its `parent`.
// The button list stays flat so user and device overrides keep working by id.
import type { DockbarButton } from "./config.ts";

/** The parent a button really has: it must exist, not be itself, and not be inside a section. */
export function parentOf(buttons: DockbarButton[], b: DockbarButton): string | undefined {
  if (!b.parent || b.parent === b.id) return undefined;
  const parent = buttons.find((x) => x.id === b.parent);
  return parent && !parent.parent ? parent.id : undefined;
}

/** Buttons inside a section, in list order. */
export function childrenOf(buttons: DockbarButton[], id: string): DockbarButton[] {
  return buttons.filter((b) => parentOf(buttons, b) === id);
}

export function isSection(buttons: DockbarButton[], b: DockbarButton): boolean {
  return !parentOf(buttons, b) && buttons.some((x) => parentOf(buttons, x) === b.id);
}

/**
 * The list with every section's buttons straight after it, keeping their relative order.
 * The editor keeps its list in this order so the rows it shows match the list it edits.
 */
export function groupOrder(buttons: DockbarButton[]): DockbarButton[] {
  const out: DockbarButton[] = [];
  for (const b of buttons) {
    if (parentOf(buttons, b)) continue;
    out.push(b, ...childrenOf(buttons, b.id));
  }
  return out;
}

/**
 * The list with the button at `i` moved one place among its siblings, or null if it can't move that way.
 * A section moves as a block with its buttons, and a button never leaves its section.
 */
export function moveWithin(buttons: DockbarButton[], i: number, delta: number): DockbarButton[] | null {
  const b = buttons[i];
  if (!b) return null;
  const parent = parentOf(buttons, b);
  const siblings = buttons.filter((x) => parentOf(buttons, x) === parent);
  const from = siblings.indexOf(b);
  const to = from + delta;
  if (to < 0 || to >= siblings.length) return null;
  siblings.splice(to, 0, ...siblings.splice(from, 1));
  const others = buttons.filter((x) => parentOf(buttons, x) !== parent);
  return groupOrder(parent ? [...others, ...siblings] : [...siblings, ...others]);
}

/** The section to show open for the current page: the active button's section, or the active section itself. */
export function sectionFor(buttons: DockbarButton[], activeIndex: number): string | null {
  const active = buttons[activeIndex];
  if (!active) return null;
  return parentOf(buttons, active) ?? (isSection(buttons, active) ? active.id : null);
}
