import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import type { DockbarButton, DockbarConfig, FooterTool, Position } from "./config.ts";
import { childrenOf, parentOf } from "./sections.ts";

export interface ButtonClickDetail {
  button: DockbarButton;
}

export const FOOTER_BUTTONS: Record<FooterTool, DockbarButton> = {
  settings: { id: "tool-settings", name: "Dockbar settings", icon: "mdi:tune-variant", action: "settings" },
  menu: { id: "tool-menu", name: "Home Assistant menu", icon: "mdi:menu", action: "toggle_sidebar" },
  header: { id: "tool-header", name: "Show/hide header", icon: "mdi:page-layout-header", action: "toggle_header" },
  off: { id: "tool-off", name: "Turn off Dockbar", icon: "mdi:power", action: "disable" },
};

// Named shadows; anything else is used as CSS as it is.
const SHADOWS: Record<string, string> = {
  none: "0 0 #0000",
  soft: "0 2px 6px rgba(0, 0, 0, 0.35)",
  raised: "0 6px 16px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3)",
  glow: "0 0 12px var(--db-indicator)",
  // A solid darker "side" under the button, a soft drop shadow and a light top edge.
  "3d": "0 4px 0 var(--db-edge), 0 6px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.22)",
};

/** Fades the bar colour with color-mix, which works for hex, rgb(a), named colours and theme vars. */
function barBackground(background: string, opacity: number | null): string {
  if (opacity === null || opacity >= 100 || /gradient|url\(/i.test(background)) return background;
  return `color-mix(in srgb, ${background} ${opacity}%, transparent)`;
}

export class DockbarNav extends LitElement {
  static properties = {
    config: { attribute: false },
    position: { reflect: true },
    off: { type: Boolean, reflect: true },
    activeIndex: { attribute: false },
    states: { attribute: false },
    badges: { attribute: false },
    openSection: { attribute: false },
  };

  declare config?: DockbarConfig;
  declare position: Position;
  declare off: boolean;
  declare activeIndex: number;
  /** Formatted live values, by button id. */
  declare states: Record<string, string>;
  /** Count badges, by button id. Only buttons with a count above zero are listed. */
  declare badges: Record<string, number>;
  /** The section whose buttons are showing. One at a time. */
  declare openSection: string | null;

  constructor() {
    super();
    this.position = "left";
    this.off = false;
    this.activeIndex = -1;
    this.states = {};
    this.badges = {};
    this.openSection = null;
  }

  private emit(button: DockbarButton) {
    this.dispatchEvent(new CustomEvent<ButtonClickDetail>("dockbar-click", { detail: { button } }));
  }

  // Sizes go on the host itself, because the host's own width/height depend on them.
  willUpdate(changed: PropertyValues<this>) {
    const c = this.config;
    if (!c || !changed.has("config")) return;
    const vars: Record<string, string> = {
      "--db-size": `${c.size}px`,
      "--db-pad": `${c.padding}px`,
      "--db-gap": `${c.gap}px`,
      "--db-btn-len": `${c.button_length ?? c.size - c.padding * 2}px`,
      "--db-btn-min": `${c.button_min_length}px`,
      "--db-btn-len-top": `${c.button_length ?? c.size - c.padding * 2}px`,
      "--db-btn-min-top": `${c.button_min_length}px`,
      "--db-bar-bg": barBackground(c.background, c.background_opacity),
      "--db-bar-filter": c.backdrop_filter,
      "--db-indicator": c.indicator_color,
    };
    for (const [k, v] of Object.entries(vars)) this.style.setProperty(k, v);
    this.setAttribute("indicator", c.active_indicator);
    this.setAttribute("hover", c.hover_effect);
  }

  render() {
    const c = this.config;
    if (!c) return nothing;
    if (this.off) {
      return html`<button class="restore" title="Turn on Dockbar" aria-label="Turn on Dockbar" @click=${() => this.dispatchEvent(new Event("dockbar-on"))}>
        <ha-icon icon="mdi:dock-${this.position}"></ha-icon>
      </button>`;
    }
    return html`
      <nav class="bar" part="bar" aria-label="Dockbar">
        <div class="main">${this.renderMain(c)}</div>
        ${c.footer.length
          ? html`<div class="footer" part="footer">
              ${c.footer.map((t) => this.renderButton(c, FOOTER_BUTTONS[t], { showName: false }))}
            </div>`
          : nothing}
      </nav>
    `;
  }

  /** Top-level buttons, with an open section's buttons straight after it. */
  private renderMain(c: DockbarConfig) {
    const all = c.buttons;
    const activeId = all[this.activeIndex]?.id;
    return all.map((b) => {
      if (b.hidden || parentOf(all, b)) return nothing;
      const kids = childrenOf(all, b.id).filter((k) => !k.hidden);
      // A section with nothing to show and no page of its own isn't worth a button.
      if (!kids.length) return b.action === "section" ? nothing : this.renderButton(c, b, { active: b.id === activeId });
      const open = this.openSection === b.id;
      const childActive = kids.some((k) => k.id === activeId);
      // Closed, a section stands in for its buttons: it shows their badges and that you're inside it.
      const badge = open ? this.badges[b.id] : [b, ...kids].reduce((n, k) => n + (this.badges[k.id] ?? 0), 0);
      return html`${this.renderButton(c, b, {
        active: b.id === activeId || (childActive && !open),
        current: childActive && open,
        section: open ? "open" : "closed",
        badge,
      })}
      ${open
        ? html`<div class="children" part="children" role="group" aria-label=${b.name ?? ""}>
            ${kids.map((k) => this.renderButton(c, k, { active: k.id === activeId, child: true }))}
          </div>`
        : nothing}`;
    });
  }

  private renderButton(
    c: DockbarConfig,
    b: DockbarButton,
    opts: { active?: boolean; showName?: boolean; current?: boolean; child?: boolean; section?: "open" | "closed"; badge?: number } = {},
  ) {
    const { active = false, showName = true, current = false, child = false, section } = opts;
    const badge = opts.badge ?? this.badges[b.id];
    const s = {
      ...c.defaults,
      ...b,
      ...(active ? c.active : {}),
      ...(badge ? c.alert : {}),
      ...(badge && b.alert_icon_color ? { icon_color: b.alert_icon_color } : {}),
    };
    const vars = {
      "--db-bg": s.background,
      "--db-border": s.border,
      "--db-radius": s.border_radius,
      "--db-icon-color": s.icon_color,
      "--db-name-color": s.name_color,
      "--db-icon-size": child ? `calc(${s.icon_size ?? "24px"} * 0.8)` : s.icon_size,
      "--db-font-size": s.font_size,
      "--db-state-color": s.state_color,
      "--db-badge-color": s.badge_color,
      "--db-shadow": s.shadow ? (SHADOWS[s.shadow] ?? s.shadow) : undefined,
    };
    const state = this.states[b.id];
    const flags = [
      active ? "active" : "",
      badge ? "alert" : "",
      current ? "current" : "",
      child ? "child" : "",
      section ? "section" : "",
      s.shadow === "3d" ? "d3" : "",
      section === "open" ? "open" : "",
    ].filter(Boolean);
    return html`
      <button
        class=${["btn", ...flags].join(" ")}
        part=${["button", ...flags].join(" ")}
        style=${styleMap(vars)}
        title=${[b.name, state, badge ? String(badge) : ""].filter(Boolean).join(": ")}
        aria-label=${b.name ?? b.icon ?? ""}
        aria-current=${active ? "page" : "false"}
        aria-expanded=${section ? String(section === "open") : nothing}
        @click=${() => this.emit(b)}
      >
        ${b.icon ? html`<ha-icon .icon=${b.icon}></ha-icon>` : nothing}
        ${badge ? html`<span class="badge" part="badge">${badge > 99 ? "99+" : badge}</span>` : nothing}
        ${showName && c.show_names && b.name ? html`<span class="name">${b.name}</span>` : nothing}
        ${state !== undefined ? html`<span class="state" part="state">${state}</span>` : nothing}
        ${section ? html`<ha-icon class="caret" icon="mdi:chevron-down"></ha-icon>` : nothing}
      </button>
    `;
  }

  updated(changed: PropertyValues<this>) {
    if (!changed.has("config") && !changed.has("off")) return;
    let el = this.renderRoot.querySelector<HTMLStyleElement>("style.user");
    if (!this.config?.style || this.off) return el?.remove();
    if (!el) {
      el = document.createElement("style");
      el.className = "user";
      this.renderRoot.appendChild(el);
    }
    el.textContent = this.config.style;
  }

  static styles = css`
    :host {
      position: fixed;
      /* Above HA's header (4) and docked sidebar (6); HA dialogs use the top layer. */
      z-index: 7;
      display: block;
      box-sizing: border-box;
    }
    :host([hidden]) {
      display: none;
    }
    :host([position="left"]),
    :host([position="right"]) {
      top: 0;
      bottom: 0;
      width: var(--db-size);
    }
    :host([position="left"]) {
      left: env(safe-area-inset-left, 0px);
    }
    :host([position="right"]) {
      right: env(safe-area-inset-right, 0px);
    }
    :host([position="top"]),
    :host([position="bottom"]) {
      left: 0;
      right: 0;
      height: var(--db-size);
    }
    :host([position="top"]) {
      top: env(safe-area-inset-top, 0px);
    }
    :host([position="bottom"]) {
      bottom: env(safe-area-inset-bottom, 0px);
    }

    .bar {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      display: flex;
      gap: var(--db-gap);
      padding: var(--db-pad);
      background: var(--db-bar-bg);
      backdrop-filter: var(--db-bar-filter);
      -webkit-backdrop-filter: var(--db-bar-filter);
    }
    .main {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      display: flex;
      gap: var(--db-gap);
      overflow: auto;
      scrollbar-width: none;
    }
    .main::-webkit-scrollbar {
      display: none;
    }
    .footer {
      flex: 0 0 auto;
      display: grid;
      gap: calc(var(--db-gap) / 2);
    }
    :host([position="left"]) .bar,
    :host([position="right"]) .bar,
    :host([position="left"]) .main,
    :host([position="right"]) .main {
      flex-direction: column;
    }
    /* Footer: a 2-column grid on side bars, two rows on top/bottom bars. */
    :host([position="left"]) .footer,
    :host([position="right"]) .footer {
      grid-template-columns: repeat(2, 1fr);
      padding-top: var(--db-gap);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    :host([position="top"]) .footer,
    :host([position="bottom"]) .footer {
      grid-auto-flow: column;
      grid-template-rows: repeat(2, 1fr);
      padding-left: var(--db-gap);
      border-left: 1px solid rgba(255, 255, 255, 0.08);
    }
    .footer .btn {
      --db-icon-size: 18px;
      padding: 6px;
      opacity: 0.75;
    }
    .footer .btn:hover {
      opacity: 1;
    }

    .btn {
      all: unset;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px;
      background: var(--db-bg);
      border: var(--db-border, none);
      border-radius: var(--db-radius);
      color: var(--db-name-color);
      -webkit-tap-highlight-color: transparent;
    }
    :host([position="left"]) .main .btn,
    :host([position="right"]) .main .btn {
      width: 100%;
      flex: 0 1 var(--db-btn-len);
      min-height: var(--db-btn-min);
    }
    :host([position="top"]) .main .btn,
    :host([position="bottom"]) .main .btn {
      height: 100%;
      flex: 0 1 var(--db-btn-len);
      min-width: var(--db-btn-min);
    }
    .btn {
      position: relative;
      box-shadow: var(--db-shadow, 0 0 #0000);
    }
    /* Something needs attention: a count in the corner and a ring in the badge colour. */
    .btn.alert {
      box-shadow:
        0 0 0 2px var(--db-badge-color, var(--accent-color, #ff9800)) inset,
        var(--db-shadow, 0 0 #0000);
    }
    .badge {
      position: absolute;
      top: 3px;
      right: 3px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      box-sizing: border-box;
      border-radius: 9px;
      display: grid;
      place-items: center;
      background: var(--db-badge-color, var(--accent-color, #ff9800));
      color: var(--text-accent-color, var(--text-primary-color, #fff));
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
    /* Sections: a caret shows there's more inside, and turns when open. */
    .caret {
      position: absolute;
      right: 2px;
      bottom: 2px;
      --mdc-icon-size: 14px;
      opacity: 0.6;
      color: var(--db-name-color);
      transition: transform 0.15s ease;
    }
    :host([position="top"]) .caret,
    :host([position="bottom"]) .caret {
      transform: rotate(-90deg);
    }
    .btn.open .caret {
      transform: rotate(180deg);
    }
    :host([position="top"]) .btn.open .caret,
    :host([position="bottom"]) .btn.open .caret {
      transform: rotate(90deg);
    }
    /* The open section's buttons: slightly smaller, set in, with a line tying them to their section. */
    .children {
      flex: 0 0 auto;
      display: flex;
      gap: calc(var(--db-gap) / 2);
      --db-btn-len: calc(var(--db-btn-len-top) * 0.8);
      --db-btn-min: calc(var(--db-btn-min-top) * 0.8);
      animation: db-open 0.15s ease;
    }
    :host([position="left"]) .children,
    :host([position="right"]) .children {
      flex-direction: column;
      margin-inline: 6px;
      padding-inline-start: 6px;
      border-inline-start: 2px solid var(--db-section-line, rgba(255, 255, 255, 0.18));
    }
    :host([position="top"]) .children,
    :host([position="bottom"]) .children {
      flex-direction: row;
      margin-block: 6px;
      padding-inline-start: 6px;
      border-inline-start: 2px solid var(--db-section-line, rgba(255, 255, 255, 0.18));
    }
    /* Children may be smaller than top-level buttons, but never shorter than their icon, name and value. */
    :host([position="left"]) .children .btn,
    :host([position="right"]) .children .btn {
      flex: 0 0 auto;
    }
    :host([position="top"]) .children .btn,
    :host([position="bottom"]) .children .btn {
      flex: 0 0 auto;
      min-width: max(var(--db-btn-min), var(--db-btn-len));
    }
    /* Open section that holds the current page: a lighter mark than the page's own button. */
    .btn.current {
      box-shadow:
        0 0 0 1px var(--db-name-color) inset,
        var(--db-shadow, 0 0 #0000);
    }
    @keyframes db-open {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
    /* Hover effects */
    :host([hover="brighten"]) .btn:hover {
      filter: brightness(1.25);
    }
    :host([hover="lift"]) .btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
    }
    :host([hover="grow"]) .btn:hover {
      transform: scale(1.1);
      z-index: 1;
    }
    :host([hover="glow"]) .btn:hover {
      box-shadow: 0 0 14px var(--db-indicator);
    }
    .btn {
      transition:
        transform 0.15s ease,
        filter 0.15s ease,
        box-shadow 0.15s ease,
        opacity 0.15s ease;
    }
    .btn:active {
      transform: scale(0.96);
    }

    /* 3D buttons: a side in a darker shade of the button's own colour, a light sheen on top,
       pushed in while pressed and while it's the current page. */
    .btn.d3 {
      --db-edge: color-mix(in srgb, var(--db-bg, #444) 55%, #000);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 45%, rgba(0, 0, 0, 0.12)),
        var(--db-bg);
      margin-bottom: 4px;
    }
    .btn.d3:active,
    .main .btn.d3.active {
      transform: translateY(3px);
      box-shadow:
        0 1px 0 var(--db-edge),
        0 2px 4px rgba(0, 0, 0, 0.3),
        inset 0 2px 4px rgba(0, 0, 0, 0.25);
    }
    :host([hover="lift"]) .btn.d3:hover:not(:active) {
      transform: translateY(-2px);
      box-shadow:
        0 6px 0 var(--db-edge),
        0 10px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }
    :host([hover="lift"]) .main .btn.d3.active:hover:not(:active) {
      transform: translateY(1px);
      box-shadow:
        0 2px 0 var(--db-edge),
        0 3px 6px rgba(0, 0, 0, 0.3);
    }

    /* How the current page is marked. "fill" relies on the active style alone. */
    :host([indicator="line"]) .main .btn.active::before {
      content: "";
      position: absolute;
      background: var(--db-indicator);
      border-radius: 2px;
    }
    :host([indicator="line"][position="left"]) .main .btn.active::before {
      left: 0;
      top: 20%;
      bottom: 20%;
      width: 3px;
    }
    :host([indicator="line"][position="right"]) .main .btn.active::before {
      right: 0;
      top: 20%;
      bottom: 20%;
      width: 3px;
    }
    :host([indicator="line"][position="top"]) .main .btn.active::before,
    :host([indicator="line"][position="bottom"]) .main .btn.active::before {
      left: 20%;
      right: 20%;
      height: 3px;
    }
    :host([indicator="line"][position="top"]) .main .btn.active::before {
      bottom: 0;
    }
    :host([indicator="line"][position="bottom"]) .main .btn.active::before {
      top: 0;
    }
    :host([indicator="pill"]) .main .btn.active ha-icon:not(.caret) {
      background: color-mix(in srgb, var(--db-indicator) 30%, transparent);
      border-radius: 999px;
      padding: 4px 14px;
    }
    :host([indicator="dot"]) .main .btn.active::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 3px;
      width: 6px;
      height: 6px;
      margin-left: -3px;
      border-radius: 50%;
      background: var(--db-indicator);
    }
    :host([indicator="glow"]) .main .btn.active {
      box-shadow:
        0 0 0 1px var(--db-indicator) inset,
        0 0 16px color-mix(in srgb, var(--db-indicator) 70%, transparent),
        var(--db-shadow, 0 0 #0000);
    }
    .btn:focus-visible {
      outline: 2px solid var(--db-name-color);
      outline-offset: 2px;
    }
    ha-icon {
      color: var(--db-icon-color);
      --mdc-icon-size: var(--db-icon-size);
      flex-shrink: 0;
    }
    .name {
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      font-size: var(--db-font-size);
      line-height: 1.15;
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .state {
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      font-size: calc(var(--db-font-size, 12px) * 0.95);
      font-weight: 600;
      line-height: 1.1;
      color: var(--db-state-color, var(--db-name-color));
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* Turned off: a round button in the bottom-right corner, clear of HA's sidebar. */
    :host([off]) {
      width: auto;
      height: auto;
      top: auto;
      left: auto;
      right: calc(env(safe-area-inset-right, 0px) + 16px);
      bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
    }
    .restore {
      all: unset;
      cursor: pointer;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--primary-color, #5b3fd1);
      color: var(--text-primary-color, #fff);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
      opacity: 0.75;
      transition:
        opacity 0.15s ease,
        transform 0.15s ease;
      --mdc-icon-size: 22px;
    }
    .restore:hover,
    .restore:focus-visible {
      opacity: 1;
      transform: scale(1.08);
    }
  `;
}
