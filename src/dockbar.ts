import { DockbarNav, type ButtonClickDetail } from "./bar.ts";
import { ConfigError, loadYamlLayer, safeUrl, type DockbarButton, type DockbarConfig, type Layer, type Position } from "./config.ts";
import { DockbarEditor, type EditorHost } from "./editor/editor.ts";
import * as ha from "./ha.ts";
import { badgeSource, cleanPath, findActive, onAnyPath } from "./match.ts";
import { isSection, sectionFor } from "./sections.ts";
import { merge } from "./merge.ts";
import { KEY, LayerStore, type Scope } from "./storage.ts";

declare const __DOCKBAR_VERSION__: string;
declare global {
  interface Window {
    __dockbar?: Dockbar;
  }
}

const TAG = "dockbar-nav";
const EDITOR_TAG = "dockbar-editor";
const DEFAULT_CONFIG_URL = "/local/dockbar/config.yaml";
// How often to re-check the header, the left padding and live entity values.
const CHROME_POLL_MS = 750;
const HOOK_CHECK_DELAY_MS = 5000;
const SCOPE_ORDER: Scope[] = ["shared", "user", "device"];

class Dockbar implements EditorHost {
  config!: DockbarConfig;
  private bar: DockbarNav;
  private draft: { scope: Scope; layer: Layer } | null = null;
  /** Turned off on this device with the pinned button. */
  private deviceOff = LayerStore.isOff();
  /** switch.dockbar, for every screen at once. */
  private switchOn = true;
  /** False once the integration is disabled and HA drops our module. */
  private moduleLoaded = true;
  /** Session-only override from the Header button; null follows the config. */
  private headerToggle: boolean | null = null;
  /** The current page is in hide_on. */
  private routeHidden = false;
  private statesKey = "";
  private badgesKey = "";
  /** Live counts behind the badges. Subscriptions start the first time a button needs one. */
  private counts = { notifications: 0, repairs: 0 };
  private watching = new Set<string>();
  private statesRef: unknown;
  private position: Position | null = null;
  private mobileQuery: MediaQueryList | null = null;
  private onMobileChange = () => this.refresh();
  /** Below mobile_breakpoint with mobile_position "hidden". */
  private phoneHidden = false;

  constructor(
    private store: LayerStore,
    private yaml: Layer | null,
    /** Mirrors HA's sidebar until someone saves a shared config. */
    private firstRun: Layer,
  ) {
    this.bar = document.createElement(TAG) as unknown as DockbarNav;
    this.bar.addEventListener("dockbar-click", (e) =>
      this.onClick((e as CustomEvent<ButtonClickDetail>).detail.button),
    );
    this.bar.addEventListener("dockbar-on", () => this.setOff(false));
    document.body.appendChild(this.bar);

    ha.onRouteChange(() => this.onRoute());
    // HA re-creates hui-root per dashboard and flips the drawer between modal and docked on resize.
    // Nothing to keep in step while the tab is hidden; catch up as soon as it's shown.
    setInterval(() => document.hidden || this.syncChrome(), CHROME_POLL_MS);
    document.addEventListener("visibilitychange", () => document.hidden || this.syncChrome());

    ha.watchOwnModule((loaded) => {
      this.moduleLoaded = loaded;
      this.refresh();
    });

    this.refresh();
    if (ha.wantsEditor()) this.openEditor();
  }

  // ------------------------------------------------------------ EditorHost

  get isAdmin() {
    return Boolean(ha.hass()?.user?.is_admin);
  }

  get usingSidebar() {
    return !this.store.shared && !this.yaml;
  }

  get usingYaml() {
    return !this.store.shared && Boolean(this.yaml);
  }

  private layers(count: number, draft: { scope: Scope; layer: Layer } | null): (Layer | null)[] {
    return SCOPE_ORDER.slice(0, count).map((scope) => {
      if (scope === "shared") return this.withNewDashboards(draft?.scope === scope ? draft.layer : (this.store.shared ?? this.yaml ?? this.firstRun));
      if (draft?.scope === scope) return draft.layer;
      return this.store.get(scope);
    });
  }

  /** With "Add new dashboards automatically" on, dashboards created since the last save join the end of the bar. */
  private withNewDashboards(layer: Layer): Layer {
    if (!layer.auto_add_dashboards) return layer;
    // A config that has never recorded the dashboards it knew about adds nothing until it does.
    const added = ha.newDashboardButtons(layer.buttons ?? [], layer.seen_panels ?? ha.dashboardPaths());
    return added.length ? { ...layer, buttons: [...(layer.buttons ?? []), ...added] } : layer;
  }

  lowerFor(scope: Scope) {
    return merge(this.layers(SCOPE_ORDER.indexOf(scope), null));
  }

  workingFor(scope: Scope) {
    return merge(this.layers(SCOPE_ORDER.indexOf(scope) + 1, null));
  }

  preview(scope: Scope, layer: Layer | null) {
    this.draft = layer ? { scope, layer } : null;
    this.refresh();
  }

  async save(scope: Scope, layer: Layer) {
    // Saving the Everyone config is the admin seeing the bar as it is, so every dashboard now counts as seen.
    if (scope === "shared" && layer.auto_add_dashboards) layer = { ...layer, seen_panels: ha.dashboardPaths() };
    await this.store.save(scope, layer);
  }

  // ------------------------------------------------------------ state

  /** Hidden everywhere: by the switch or by disabling the integration. No restore button. */
  private get globalOff() {
    return !this.switchOn || !this.moduleLoaded;
  }

  private get off() {
    return this.deviceOff || this.globalOff;
  }

  /** No bar on screen and no space reserved for it. HA's own sidebar/header settings still apply on hide_on pages. */
  private get barGone() {
    return this.chromeOff || this.routeHidden;
  }

  /** HA's sidebar and header come back, so a phone without the bar can still get around. */
  private get chromeOff() {
    return this.off || this.phoneHidden;
  }

  private get headerHidden() {
    return !this.chromeOff && (this.headerToggle ?? this.config.hide_header);
  }

  /** Re-merges every layer and re-applies everything. Called on any config change. */
  refresh() {
    const merged = merge(this.layers(SCOPE_ORDER.length, this.draft));
    // Buttons for pages this user can't open (e.g. Settings for a non-admin) are left off their bar.
    merged.buttons = merged.buttons.map((b) =>
      b.action === "navigate" && b.path && !ha.canOpen(b.path) ? { ...b, hidden: true } : b,
    );
    const query = `(max-width: ${merged.mobile_breakpoint - 1}px)`;
    if (this.mobileQuery?.media !== query) {
      this.mobileQuery?.removeEventListener("change", this.onMobileChange);
      this.mobileQuery = window.matchMedia(query);
      this.mobileQuery.addEventListener("change", this.onMobileChange);
    }
    const phone = this.mobileQuery.matches;
    this.phoneHidden = phone && merged.mobile_position === "hidden";
    // On phones the bar uses its own thickness, so everything downstream just reads config.size.
    this.config = phone && merged.mobile_size ? { ...merged, size: merged.mobile_size } : merged;

    this.bar.config = this.config;
    this.bar.off = this.deviceOff;
    this.routeHidden = onAnyPath(location.pathname, this.config.hide_on);
    this.applyVisibility();
    this.statesKey = "";
    this.badgesKey = "";
    this.statesRef = undefined;
    this.layout();
    ha.setSidebarHidden(!this.chromeOff && this.config.hide_sidebar);
    this.onRoute();
  }

  private layout() {
    const c = this.config;
    const mobile = this.mobileQuery?.matches ? c.mobile_position : null;
    const pos = mobile && mobile !== "hidden" ? mobile : c.position;
    this.position = pos;
    this.bar.position = pos;
    ha.setInset(this.barGone ? null : pos, c.size);
    this.syncChrome();
  }

  private applyVisibility() {
    this.bar.hidden = this.globalOff || this.routeHidden || this.phoneHidden;
  }

  private syncChrome() {
    const switchOn = ha.dockbarSwitchState() !== "off";
    if (switchOn !== this.switchOn) {
      this.switchOn = switchOn;
      return this.refresh();
    }
    ha.applyHeaderHidden(this.headerHidden);
    ha.syncLeftPad(!this.barGone && this.position === "left");
    this.syncStates();
  }

  /** Live entity values on buttons. Only re-renders the bar when a shown value changes. */
  private syncStates() {
    if (this.barGone) return;
    // HA swaps in a new states object whenever any entity changes, so the same one means nothing to recompute.
    const ref = ha.hass()?.states;
    if (ref && ref === this.statesRef) return;
    this.statesRef = ref;
    const states: Record<string, string> = {};
    for (const b of this.config.buttons) {
      if (b.hidden || !b.entity) continue;
      const text = ha.entityText(b.entity, b.attribute);
      if (text !== undefined) states[b.id] = text;
    }
    const key = JSON.stringify(states);
    if (key !== this.statesKey) {
      this.statesKey = key;
      this.bar.states = states;
    }
    this.syncBadges();
  }

  private syncBadges() {
    if (this.barGone) return;
    const badges: Record<string, number> = {};
    let updates: number | undefined;
    for (const b of this.config.buttons) {
      if (b.hidden) continue;
      const source = badgeSource(b);
      let n = 0;
      if (source === "notifications") n = this.watch("notifications");
      else if (source === "repairs") n = this.watch("repairs");
      else if (source === "updates") n = updates ??= ha.updatesCount();
      else if (source === "config") n = (updates ??= ha.updatesCount()) + this.watch("repairs");
      if (n > 0) badges[b.id] = n;
    }
    const key = JSON.stringify(badges);
    if (key === this.badgesKey) return;
    this.badgesKey = key;
    this.bar.badges = badges;
  }

  private watch(source: "notifications" | "repairs"): number {
    if (!this.watching.has(source)) {
      this.watching.add(source);
      const onCount = (n: number) => {
        this.counts[source] = n;
        this.syncBadges();
      };
      if (source === "notifications") ha.watchNotifications(onCount);
      else ha.watchRepairs(onCount);
    }
    return this.counts[source];
  }

  private onRoute() {
    const hidden = onAnyPath(location.pathname, this.config.hide_on);
    if (hidden !== this.routeHidden) {
      this.routeHidden = hidden;
      this.applyVisibility();
      this.layout();
    }
    const active = findActive(this.config.buttons, location.pathname);
    // Moving to another page opens the section it belongs to and closes the rest.
    if (active !== this.bar.activeIndex) {
      this.bar.openSection = sectionFor(this.config.buttons, active);
    }
    this.bar.activeIndex = active;
    // Wait a frame for HA to render the new panel before touching its header.
    requestAnimationFrame(() => this.syncChrome());
  }

  private setOff(off: boolean) {
    this.deviceOff = off;
    LayerStore.setOff(off);
    this.headerToggle = null;
    this.refresh();
  }

  private isHere(b: DockbarButton) {
    return b.action === "navigate" && Boolean(b.path) && cleanPath(b.path!) === cleanPath(location.pathname);
  }

  openEditor() {
    if (document.querySelector(EDITOR_TAG)) return;
    (document.createElement(EDITOR_TAG) as unknown as DockbarEditor).open(this);
  }

  private onClick(b: DockbarButton) {
    if (isSection(this.config.buttons, b)) {
      const open = this.bar.openSection === b.id;
      // A section without a page of its own just opens and closes. One with a page opens it,
      // and tapping it again while you're there closes the list.
      if (b.action === "section" || (open && this.isHere(b))) {
        this.bar.openSection = open ? null : b.id;
        return;
      }
      this.bar.openSection = b.id;
    }
    switch (b.action) {
      case "navigate":
        if (b.path && cleanPath(b.path) !== cleanPath(location.pathname)) ha.navigate(b.path);
        break;
      case "url":
        if (b.url && safeUrl(b.url)) window.open(b.url, "_blank", "noopener");
        break;
      case "toggle_sidebar":
        ha.toggleSidebar();
        break;
      case "toggle_header":
        this.headerToggle = !this.headerHidden;
        ha.applyHeaderHidden(this.headerHidden);
        break;
      case "settings":
        this.openEditor();
        break;
      case "disable":
        this.setOff(true);
        break;
      case "notifications":
        ha.showNotifications();
        break;
    }
  }
}

async function start() {
  // Guard against being loaded twice, e.g. as both a dashboard resource and extra_module_url.
  if (window.__dockbar || customElements.get(TAG)) return;
  customElements.define(TAG, DockbarNav);
  customElements.define(EDITOR_TAG, DockbarEditor);

  console.info(
    `%c DOCKBAR %c v${__DOCKBAR_VERSION__} `,
    "color:#fff;background:#5b3fd1;font-weight:700;border-radius:3px 0 0 3px",
    "color:#5b3fd1;background:#eee;border-radius:0 3px 3px 0",
  );

  // ?dockbar=on also undoes the per-device "Turn off" button.
  if (new URLSearchParams(location.search).get("dockbar") === "on") LayerStore.setOff(false);

  if (ha.isDisabled()) {
    console.info("Dockbar: disabled for this session. Add ?dockbar=on to the URL to re-enable.");
    await ha.waitForHass();
    // Turning the integration off and on again counts as asking for the bar back.
    let removed = false;
    ha.watchOwnModule((loaded) => {
      if (!loaded) removed = true;
      else if (removed) {
        removed = false;
        ha.clearDisabled();
        launch().catch((err) => console.error("Dockbar: failed to start", err));
      }
    });
    return;
  }

  await launch();
}

async function launch() {
  await ha.waitForHass();
  // For development: `dockbar.js?config=<url>` reads the YAML from somewhere else.
  const configUrl = new URL(import.meta.url).searchParams.get("config") ?? DEFAULT_CONFIG_URL;

  let yaml: Layer | null = null;
  try {
    yaml = await loadYamlLayer(configUrl, (m) => console.warn(`Dockbar: ${m}`));
  } catch (err) {
    console.error(`Dockbar: ${err instanceof ConfigError ? err.message : err}`);
  }

  let dockbar: Dockbar | undefined;
  const store = new LayerStore(ha.frontendData(KEY), () => dockbar?.refresh());
  await store.start();
  let firstRun: Layer = {};
  try {
    // A fresh install starts with new dashboards being added, from the ones that exist now.
    firstRun = {
      buttons: ha.sidebarDefaults(await ha.sidebarPrefs()),
      auto_add_dashboards: true,
      seen_panels: ha.dashboardPaths(),
    };
  } catch (err) {
    console.error("Dockbar: couldn't read the sidebar to build the first-run bar", err);
  }
  dockbar = new Dockbar(store, yaml, firstRun);
  window.__dockbar = dockbar;

  // Turn a silent break after a Home Assistant update into something that can be reported.
  setTimeout(() => {
    const problems = ha.checkHooks();
    if (problems.length) {
      console.warn(`Dockbar: Home Assistant doesn't look as expected, so some features may not work. Missing: ${problems.join("; ")}.`);
    }
  }, HOOK_CHECK_DELAY_MS);
}

start().catch((err) => console.error("Dockbar: failed to start", err));
