import { DockbarNav, type ButtonClickDetail } from "./bar.ts";
import { ConfigError, loadYamlLayer, type DockbarButton, type DockbarConfig, type Layer, type Position } from "./config.ts";
import { DockbarEditor, type EditorHost } from "./editor.ts";
import * as ha from "./ha.ts";
import { cleanPath, findActive, onAnyPath } from "./match.ts";
import { merge } from "./merge.ts";
import { LayerStore, type Scope } from "./storage.ts";

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
  private position: Position | null = null;
  private mobileQuery: MediaQueryList | null = null;
  private onMobileChange = () => this.layout();

  constructor(
    private store: LayerStore,
    private yaml: Layer | null,
  ) {
    this.bar = document.createElement(TAG) as unknown as DockbarNav;
    this.bar.addEventListener("dockbar-click", (e) =>
      this.onClick((e as CustomEvent<ButtonClickDetail>).detail.button),
    );
    this.bar.addEventListener("dockbar-on", () => this.setOff(false));
    document.body.appendChild(this.bar);

    window.addEventListener("location-changed", () => this.onRoute());
    window.addEventListener("popstate", () => this.onRoute());
    // HA re-creates hui-root per dashboard and flips the drawer between modal and docked on resize.
    setInterval(() => this.syncChrome(), CHROME_POLL_MS);

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

  get usingYaml() {
    return !this.store.shared && Boolean(this.yaml);
  }

  private layers(count: number, draft: { scope: Scope; layer: Layer } | null): (Layer | null)[] {
    return SCOPE_ORDER.slice(0, count).map((scope) => {
      if (draft?.scope === scope) return draft.layer;
      if (scope === "shared") return this.store.shared ?? this.yaml;
      return this.store.get(scope);
    });
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
    return this.off || this.routeHidden;
  }

  private get headerHidden() {
    return !this.off && (this.headerToggle ?? this.config.hide_header);
  }

  /** Re-merges every layer and re-applies everything. Called on any config change. */
  refresh() {
    this.config = merge(this.layers(SCOPE_ORDER.length, this.draft));
    this.bar.config = this.config;
    this.bar.off = this.deviceOff;
    this.routeHidden = onAnyPath(location.pathname, this.config.hide_on);
    this.applyVisibility();
    this.statesKey = "";

    const query = `(max-width: ${this.config.mobile_breakpoint - 1}px)`;
    if (this.mobileQuery?.media !== query) {
      this.mobileQuery?.removeEventListener("change", this.onMobileChange);
      this.mobileQuery = window.matchMedia(query);
      this.mobileQuery.addEventListener("change", this.onMobileChange);
    }
    this.layout();
    ha.setSidebarHidden(!this.off && this.config.hide_sidebar);
    this.onRoute();
  }

  private layout() {
    const c = this.config;
    const pos = this.mobileQuery?.matches && c.mobile_position ? c.mobile_position : c.position;
    this.position = pos;
    this.bar.position = pos;
    ha.setInset(this.barGone ? null : pos, c.size);
    this.syncChrome();
  }

  private applyVisibility() {
    this.bar.hidden = this.globalOff || this.routeHidden;
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
    const states: Record<string, string> = {};
    for (const b of this.config.buttons) {
      if (b.hidden || !b.entity) continue;
      const text = ha.entityText(b.entity, b.attribute);
      if (text !== undefined) states[b.id] = text;
    }
    const key = JSON.stringify(states);
    if (key === this.statesKey) return;
    this.statesKey = key;
    this.bar.states = states;
  }

  private onRoute() {
    const hidden = onAnyPath(location.pathname, this.config.hide_on);
    if (hidden !== this.routeHidden) {
      this.routeHidden = hidden;
      this.applyVisibility();
      this.layout();
    }
    this.bar.activeIndex = findActive(this.config.buttons, location.pathname);
    // Wait a frame for HA to render the new panel before touching its header.
    requestAnimationFrame(() => this.syncChrome());
  }

  private setOff(off: boolean) {
    this.deviceOff = off;
    LayerStore.setOff(off);
    this.headerToggle = null;
    this.refresh();
  }

  openEditor() {
    if (document.querySelector(EDITOR_TAG)) return;
    (document.createElement(EDITOR_TAG) as unknown as DockbarEditor).open(this);
  }

  private onClick(b: DockbarButton) {
    switch (b.action) {
      case "navigate":
        if (b.path && cleanPath(b.path) !== cleanPath(location.pathname)) ha.navigate(b.path);
        break;
      case "url":
        if (b.url) window.open(b.url, "_blank", "noopener");
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
    return;
  }

  const el = await ha.waitForHass();
  const configUrl = new URL(import.meta.url).searchParams.get("config") ?? DEFAULT_CONFIG_URL;

  let yaml: Layer | null = null;
  try {
    yaml = await loadYamlLayer(configUrl, (m) => console.warn(`Dockbar: ${m}`));
  } catch (err) {
    console.error(`Dockbar: ${err instanceof ConfigError ? err.message : err}`);
  }

  let dockbar: Dockbar | undefined;
  const store = new LayerStore(el.hass!.connection, () => dockbar?.refresh());
  await store.start();
  dockbar = new Dockbar(store, yaml);
  window.__dockbar = dockbar;
}

start();
