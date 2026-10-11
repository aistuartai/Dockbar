import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import type { DockbarButton, DockbarConfig, FooterTool, Position } from "./config.ts";

export interface ButtonClickDetail {
  button: DockbarButton;
}

export const FOOTER_BUTTONS: Record<FooterTool, DockbarButton> = {
  settings: { id: "tool-settings", name: "Dockbar settings", icon: "mdi:cog", action: "settings" },
  menu: { id: "tool-menu", name: "Home Assistant menu", icon: "mdi:menu", action: "toggle_sidebar" },
  header: { id: "tool-header", name: "Show/hide header", icon: "mdi:page-layout-header", action: "toggle_header" },
  off: { id: "tool-off", name: "Turn off Dockbar", icon: "mdi:power", action: "disable" },
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
  };

  declare config?: DockbarConfig;
  declare position: Position;
  declare off: boolean;
  declare activeIndex: number;
  /** Formatted live values, by button id. */
  declare states: Record<string, string>;

  constructor() {
    super();
    this.position = "left";
    this.off = false;
    this.activeIndex = -1;
    this.states = {};
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
      "--db-bar-bg": barBackground(c.background, c.background_opacity),
      "--db-bar-filter": c.backdrop_filter,
    };
    for (const [k, v] of Object.entries(vars)) this.style.setProperty(k, v);
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
        <div class="main">${c.buttons.map((b, i) => (b.hidden ? nothing : this.renderButton(c, b, i === this.activeIndex, true)))}</div>
        ${c.footer.length
          ? html`<div class="footer" part="footer">
              ${c.footer.map((t) => this.renderButton(c, FOOTER_BUTTONS[t], false, false))}
            </div>`
          : nothing}
      </nav>
    `;
  }

  private renderButton(c: DockbarConfig, b: DockbarButton, active: boolean, showName: boolean) {
    const s = { ...c.defaults, ...b, ...(active ? c.active : {}) };
    const vars = {
      "--db-bg": s.background,
      "--db-border": s.border,
      "--db-radius": s.border_radius,
      "--db-icon-color": s.icon_color,
      "--db-name-color": s.name_color,
      "--db-icon-size": s.icon_size,
      "--db-font-size": s.font_size,
      "--db-state-color": s.state_color,
    };
    const state = this.states[b.id];
    return html`
      <button
        class=${active ? "btn active" : "btn"}
        part=${active ? "button active" : "button"}
        style=${styleMap(vars)}
        title=${[b.name, state].filter(Boolean).join(": ")}
        aria-label=${b.name ?? b.icon ?? ""}
        aria-current=${active ? "page" : "false"}
        @click=${() => this.emit(b)}
      >
        ${b.icon ? html`<ha-icon .icon=${b.icon}></ha-icon>` : nothing}
        ${showName && c.show_names && b.name ? html`<span class="name">${b.name}</span>` : nothing}
        ${state !== undefined ? html`<span class="state" part="state">${state}</span>` : nothing}
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
      transition:
        transform 0.1s ease,
        filter 0.15s ease,
        opacity 0.15s ease;
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
    .btn:hover {
      filter: brightness(1.25);
    }
    .btn:active {
      transform: scale(0.96);
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
