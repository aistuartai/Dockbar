import type { BadgeSource, DockbarButton } from "./config.ts";

function firstSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "";
}

export function cleanPath(path: string): string {
  return path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
}

/** Exact match wins, then the longest prefix, then the only button pointing at the same dashboard. */
export function findActive(buttons: DockbarButton[], pathname: string): number {
  const here = cleanPath(pathname);
  let best = -1;
  let bestScore = 0;
  const sameDashboard: number[] = [];
  buttons.forEach((b, i) => {
    if (b.hidden || b.action !== "navigate" || !b.path) return;
    const target = cleanPath(b.path);
    let score = 0;
    if (here === target) score = 2000 + target.length;
    else if (here.startsWith(target + "/")) score = 1000 + target.length;
    else if (firstSegment(here) === firstSegment(target)) sameDashboard.push(i);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  if (best === -1 && sameDashboard.length === 1) best = sameDashboard[0];
  return best;
}

/** True when the page is one of the paths, or inside one (a dashboard path covers all its views). */
export function onAnyPath(pathname: string, paths: string[]): boolean {
  const here = cleanPath(pathname);
  return paths.some((p) => {
    const target = cleanPath(p);
    return here === target || here.startsWith(target + "/");
  });
}

/** The badge a button shows: its own setting, or the one that fits what it opens. */
export function badgeSource(b: DockbarButton): BadgeSource {
  if (b.badge) return b.badge;
  if (b.action === "notifications") return "notifications";
  if (b.action === "navigate" && b.path) {
    const p = cleanPath(b.path);
    if (p === "/config") return "config";
    if (p === "/config/updates") return "updates";
    if (p === "/config/repairs") return "repairs";
  }
  return "none";
}
