import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { load } from "js-yaml";
import {
  ACTIONS,
  FOOTER_TOOLS,
  POSITIONS,
  STYLE_KEYS,
  sanitiseLayer,
  uniqueId,
  type ButtonAction,
  type ButtonStyle,
  type DockbarButton,
  type DockbarConfig,
  type FooterTool,
  type Layer,
} from "./config.ts";
import { diffLayer } from "./merge.ts";
import { entityIds, entityText, hass, navTargets, type NavTarget } from "./ha.ts";
import type { Scope } from "./storage.ts";

export interface EditorHost {
  isAdmin: boolean;
  /** Shared config is empty and config.yaml is being used as the base. */
  usingYaml: boolean;
  lowerFor(scope: Scope): DockbarConfig;
  workingFor(scope: Scope): DockbarConfig;
  preview(scope: Scope, layer: Layer | null): void;
  save(scope: Scope, layer: Layer): Promise<void>;
}

const SCOPES: { scope: Scope; label: string; hint: string }[] = [
  { scope: "shared", label: "Everyone", hint: "The base config for all users. Admins only." },
  { scope: "user", label: "Just me", hint: "Your changes on top of the shared config, on every device you use." },
  { scope: "device", label: "This device", hint: "Changes for this browser only, e.g. a wall tablet." },
];

const ACTION_LABELS: Record<ButtonAction, string> = {
  navigate: "Open a dashboard or page",
  url: "Open a link in a new tab",
  toggle_sidebar: "Open Home Assistant menu",
  toggle_header: "Show/hide header",
  settings: "Open Dockbar settings",
  disable: "Turn off Dockbar",
};

const FOOTER_LABELS: Record<FooterTool, string> = {
  settings: "Settings",
  menu: "HA menu",
  header: "Header",
  off: "Turn off",
};

const STYLE_LABELS: Record<keyof ButtonStyle, string> = {
  background: "Background",
  border: "Border",
  border_radius: "Corner radius",
  icon_color: "Icon colour",
  name_color: "Name colour",
  icon_size: "Icon size",
  font_size: "Name size",
  state_color: "Live value colour",
};

const COLOUR_KEYS: ReadonlySet<string> = new Set(["background", "icon_color", "name_color", "state_color"]);

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  if (value === undefined || value === "") delete target[last];
  else target[last] = value;
}

function asHex(v: unknown): string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
}

export class DockbarEditor extends LitElement {
  static properties = {
    scope: { state: true },
    tab: { state: true },
    working: { state: true },
    expanded: { state: true },
    saving: { state: true },
    error: { state: true },
    targets: { state: true },
    importText: { state: true },
    importMsg: { state: true },
    dragId: { state: true },
    hideOnDraft: { state: true },
  };

  declare host_: EditorHost;
  declare scope: Scope;
  declare tab: "general" | "buttons";
  declare working: DockbarConfig;
  declare expanded: string | null;
  declare saving: boolean;
  declare error: string;
  declare targets: NavTarget[];
  declare importText: string;
  declare importMsg: string;
  declare dragId: string | null;
  declare hideOnDraft: string;
  private lower!: DockbarConfig;
  private pristine = "";

  constructor() {
    super();
    this.tab = "general";
    this.expanded = null;
    this.saving = false;
    this.error = "";
    this.targets = [];
    this.importText = "";
    this.importMsg = "";
    this.dragId = null;
    this.hideOnDraft = "";
  }

  open(host: EditorHost) {
    this.host_ = host;
    this.loadScope(host.isAdmin ? "shared" : "user");
    navTargets().then((t) => (this.targets = t));
    document.body.appendChild(this);
  }

  private loadScope(scope: Scope) {
    this.scope = scope;
    this.lower = this.host_.lowerFor(scope);
    this.working = clone(this.host_.workingFor(scope));
    this.pristine = JSON.stringify(this.working);
    this.expanded = null;
    this.error = "";
  }

  private get dirty() {
    return JSON.stringify(this.working) !== this.pristine;
  }

  private layer(): Layer {
    return diffLayer(this.lower, this.working, this.scope === "shared");
  }

  private changed() {
    this.working = { ...this.working };
    this.host_.preview(this.scope, this.layer());
  }

  private set(path: string, value: unknown) {
    // Clearing a field means "inherit", not "empty".
    if (value === "" || value === undefined) value = clone(getPath(this.lower, path) ?? null) ?? undefined;
    setPath(this.working, path, value);
    this.changed();
  }

  private switchScope(scope: Scope) {
    if (scope === this.scope) return;
    if (this.dirty && !confirm("Discard unsaved changes?")) return;
    this.host_.preview(this.scope, null);
    this.loadScope(scope);
  }

  private close() {
    if (this.dirty && !confirm("Discard unsaved changes?")) return;
    this.host_.preview(this.scope, null);
    this.remove();
  }

  private async save() {
    this.saving = true;
    this.error = "";
    try {
      await this.host_.save(this.scope, this.layer());
      this.host_.preview(this.scope, null);
      this.remove();
    } catch (err: any) {
      this.error = err?.message ?? String(err);
    } finally {
      this.saving = false;
    }
  }

  private resetScope() {
    const label = SCOPES.find((s) => s.scope === this.scope)!.label.toLowerCase();
    if (!confirm(`Remove all "${label}" changes? You'll see the config from the level below.`)) return;
    this.working = clone(this.lower);
    this.changed();
  }

  // ---------------------------------------------------------------- fields

  private field(label: string, path: string, control: TemplateResult, hint?: string) {
    const overridden = JSON.stringify(getPath(this.working, path)) !== JSON.stringify(getPath(this.lower, path));
    return html`
      <div class="field">
        <span class="label">
          ${label}
          ${overridden
            ? html`<button
                class="reset"
                title="Changed here. Click to go back to ${JSON.stringify(getPath(this.lower, path)) ?? "default"}"
                @click=${(e: Event) => {
                  e.preventDefault();
                  this.set(path, clone(getPath(this.lower, path)));
                }}
              >
                ● reset
              </button>`
            : nothing}
        </span>
        ${control} ${hint ? html`<span class="hint">${hint}</span>` : nothing}
      </div>
    `;
  }

  private text(label: string, path: string, hint?: string, placeholder = "") {
    return this.field(
      label,
      path,
      html`<input
        type="text"
        .value=${getPath(this.working, path) ?? ""}
        placeholder=${placeholder}
        @change=${(e: Event) => this.set(path, (e.target as HTMLInputElement).value.trim())}
      />`,
      hint,
    );
  }

  private number(label: string, path: string, hint?: string) {
    return this.field(
      label,
      path,
      html`<input
        type="number"
        min="0"
        .value=${String(getPath(this.working, path) ?? "")}
        @change=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          this.set(path, v === "" ? null : Number(v));
        }}
      />`,
      hint,
    );
  }

  private toggle(label: string, path: string, hint?: string) {
    return this.field(
      label,
      path,
      html`<input
        type="checkbox"
        class="switch"
        .checked=${Boolean(getPath(this.working, path))}
        @change=${(e: Event) => this.set(path, (e.target as HTMLInputElement).checked)}
      />`,
      hint,
    );
  }

  private select(label: string, path: string, options: [string, string][]) {
    const value = getPath(this.working, path) ?? "none";
    return this.field(
      label,
      path,
      html`<select
        @change=${(e: Event) => {
          const v = (e.target as HTMLSelectElement).value;
          this.set(path, v === "none" ? null : v);
        }}
      >
        ${options.map(([v, l]) => html`<option value=${v} ?selected=${v === value}>${l}</option>`)}
      </select>`,
    );
  }

  private range(label: string, path: string, hint?: string) {
    const value = getPath(this.working, path) as number | null | undefined;
    const shown = value ?? 100;
    return this.field(
      label,
      path,
      html`<span class="range">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          .value=${String(shown)}
          @input=${(e: Event) => this.set(path, Number((e.target as HTMLInputElement).value))}
        />
        <output>${shown}%</output>
      </span>`,
      hint,
    );
  }

  private colour(label: string, path: string, hint?: string) {
    const value = getPath(this.working, path) ?? "";
    return this.field(
      label,
      path,
      html`<span class="colour">
        <input
          type="color"
          .value=${asHex(value)}
          @input=${(e: Event) => this.set(path, (e.target as HTMLInputElement).value)}
        />
        <input
          type="text"
          .value=${value}
          placeholder="#9C88FF, rgba(…), var(--…)"
          @change=${(e: Event) => this.set(path, (e.target as HTMLInputElement).value.trim())}
        />
      </span>`,
      hint,
    );
  }

  private styleFields(prefix: string, keys: (keyof ButtonStyle)[] = STYLE_KEYS) {
    return keys.map((k) =>
      COLOUR_KEYS.has(k) ? this.colour(STYLE_LABELS[k], `${prefix}.${k}`) : this.text(STYLE_LABELS[k], `${prefix}.${k}`),
    );
  }

  // ---------------------------------------------------------------- general tab

  private addHideOn() {
    const raw = this.hideOnDraft.trim();
    if (!raw) return;
    const path = raw.startsWith("/") ? raw : "/" + raw;
    const list = this.working.hide_on;
    if (!list.includes(path)) this.set("hide_on", [...list, path]);
    this.hideOnDraft = "";
  }

  private renderHideOn() {
    const list = this.working.hide_on;
    const changed = JSON.stringify(list) !== JSON.stringify(this.lower.hide_on);
    return html`<section>
      <h3>Hide the bar on</h3>
      <div class="field">
        <span class="label">
          Dashboards or views
          ${changed
            ? html`<button class="reset" @click=${() => this.set("hide_on", clone(this.lower.hide_on))}>● reset</button>`
            : nothing}
        </span>
        ${list.length
          ? html`<div class="chips">
              ${list.map(
                (p) => html`<span class="chip">
                  <code>${p}</code>
                  <button class="chip-x" title="Remove" @click=${() => this.set("hide_on", list.filter((x) => x !== p))}>✕</button>
                </span>`,
              )}
            </div>`
          : nothing}
        <span class="colour">
          <input
            type="text"
            list="dockbar-paths"
            placeholder="/wall-panel"
            .value=${this.hideOnDraft}
            @input=${(e: Event) => (this.hideOnDraft = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this.addHideOn()}
          />
          <button class="text" ?disabled=${!this.hideOnDraft.trim()} @click=${() => this.addHideOn()}>Add</button>
        </span>
        <span class="hint">
          A dashboard path covers all its views. The bar is hidden and its space given back; HA's sidebar and header stay as
          set above. For a wall tablet, add it under <strong>This device</strong> on that tablet.
        </span>
      </div>
    </section>`;
  }

  private renderGeneral() {
    const positions: [string, string][] = POSITIONS.map((p) => [p, p[0].toUpperCase() + p.slice(1)]);
    const footer = this.working.footer;
    return html`
      <section>
        <h3>Layout</h3>
        <div class="grid">
          ${this.select("Position", "position", positions)}
          ${this.select("On phones", "mobile_position", [["none", "Same as position"], ...positions, ["hidden", "Hidden"]])}
          ${this.number("Phone width below", "mobile_breakpoint", "px")}
          ${this.working.mobile_position === "hidden"
            ? nothing
            : this.number("Phone bar thickness", "mobile_size", "px, blank = same as Bar thickness")}
          ${this.number("Bar thickness", "size", "px")} ${this.number("Padding", "padding", "px")}
          ${this.number("Gap", "gap", "px")}
          ${this.number("Button length", "button_length", "px, blank = square")}
          ${this.number("Smallest button", "button_min_length", "px, then the bar scrolls")}
        </div>
      </section>
      <section>
        <h3>Home Assistant</h3>
        <div class="grid">
          ${this.toggle("Hide HA sidebar", "hide_sidebar", "The Menu button still opens it")}
          ${this.toggle("Hide dashboard header", "hide_header", "Comes back when editing a dashboard")}
          ${this.toggle("Show button names", "show_names")}
        </div>
      </section>
      ${this.renderHideOn()}
      <section>
        <h3>Pinned buttons</h3>
        <div class="field">
          <span class="label">
            Shown at the end of the bar
            ${JSON.stringify(footer) !== JSON.stringify(this.lower.footer)
              ? html`<button class="reset" @click=${() => this.set("footer", clone(this.lower.footer))}>● reset</button>`
              : nothing}
          </span>
          <div class="chips">
            ${FOOTER_TOOLS.map(
              (t) => html`<label class="chip">
                <input
                  type="checkbox"
                  .checked=${footer.includes(t)}
                  @change=${(e: Event) => {
                    const on = (e.target as HTMLInputElement).checked;
                    this.set("footer", FOOTER_TOOLS.filter((x) => (x === t ? on : footer.includes(x))));
                  }}
                />
                ${FOOTER_LABELS[t]}
              </label>`,
            )}
          </div>
          ${footer.includes("settings")
            ? nothing
            : html`<span class="hint warn">Without the Settings button, add <code>?dockbar=edit</code> to the URL to get back here.</span>`}
        </div>
      </section>
      <section>
        <h3>Bar</h3>
        <div class="grid">
          ${this.colour("Background", "background")}
          ${this.range("Background opacity", "background_opacity", "100% = the colour as written")}
          ${this.text("Backdrop filter", "backdrop_filter", "e.g. blur(8px)")}
        </div>
      </section>
      <section>
        <h3>Every button</h3>
        <div class="grid">${this.styleFields("defaults")}</div>
      </section>
      <section>
        <h3>Current page's button</h3>
        <div class="grid">${this.styleFields("active", ["background", "border", "icon_color", "name_color"])}</div>
      </section>
      <section>
        <h3>Custom CSS</h3>
        ${this.field(
          "Injected into the bar",
          "style",
          html`<textarea
            rows="4"
            spellcheck="false"
            .value=${this.working.style}
            placeholder=".btn.active { box-shadow: 0 0 12px #9C88FF; }"
            @change=${(e: Event) => this.set("style", (e.target as HTMLTextAreaElement).value)}
          ></textarea>`,
        )}
      </section>
    `;
  }

  // ---------------------------------------------------------------- buttons tab

  private moveButton(i: number, delta: number) {
    const list = [...this.working.buttons];
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.working.buttons = list;
    this.changed();
  }

  // Pointer events rather than HTML drag and drop, so dragging also works on touch screens.
  private dragStart(e: PointerEvent, id: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    this.dragId = id;
  }

  private dragMove(e: PointerEvent) {
    if (!this.dragId) return;
    const from = this.working.buttons.findIndex((b) => b.id === this.dragId);
    const rows = [...this.renderRoot.querySelectorAll<HTMLElement>("ul.buttons > li")];
    // The new index is how many of the other rows the pointer is below the middle of.
    let to = 0;
    rows.forEach((li, k) => {
      const r = li.getBoundingClientRect();
      if (k !== from && e.clientY > r.top + r.height / 2) to++;
    });
    if (from < 0 || to === from) return;
    const list = [...this.working.buttons];
    list.splice(to, 0, ...list.splice(from, 1));
    this.working.buttons = list;
    this.changed();
  }

  private dragEnd() {
    this.dragId = null;
  }

  /** Unhiding writes an explicit false only when a lower level hid the button, so it can override that. */
  private toggleHidden(i: number) {
    const b = { ...this.working.buttons[i] };
    if (b.hidden) {
      if (this.lower.buttons.find((x) => x.id === b.id)?.hidden) b.hidden = false;
      else delete b.hidden;
    } else b.hidden = true;
    this.working.buttons = this.working.buttons.map((x, n) => (n === i ? b : x));
    this.changed();
  }

  private removeButton(i: number) {
    this.working.buttons = this.working.buttons.filter((_, n) => n !== i);
    this.changed();
  }

  private addButton(b?: DockbarButton) {
    const taken = new Set([...this.working.buttons, ...this.lower.buttons].map((x) => x.id));
    const button = b ?? { id: uniqueId("button", taken), name: "New button", icon: "mdi:star", action: "navigate" as const, path: "/" };
    this.working.buttons = [...this.working.buttons, button];
    this.expanded = b ? this.expanded : button.id;
    this.changed();
  }

  private setButton(i: number, key: keyof DockbarButton, value: string) {
    const b = { ...this.working.buttons[i] } as Record<string, unknown>;
    if (value === "") delete b[key];
    else b[key] = value;
    this.working.buttons = this.working.buttons.map((x, n) => (n === i ? (b as unknown as DockbarButton) : x));
    this.changed();
  }

  private buttonText(i: number, label: string, key: keyof DockbarButton, opts: { list?: string; placeholder?: string } = {}) {
    return html`<label class="field">
      <span class="label">${label}</span>
      <input
        type="text"
        list=${opts.list ?? nothing}
        placeholder=${opts.placeholder ?? ""}
        .value=${(this.working.buttons[i][key] as string) ?? ""}
        @change=${(e: Event) => this.setButton(i, key, (e.target as HTMLInputElement).value.trim())}
      />
    </label>`;
  }

  private buttonColour(i: number, label: string, key: keyof ButtonStyle) {
    const value = this.working.buttons[i][key] ?? "";
    return html`<div class="field">
      <span class="label">${label}</span>
      <span class="colour">
        <input type="color" .value=${asHex(value)} @input=${(e: Event) => this.setButton(i, key, (e.target as HTMLInputElement).value)} />
        <input
          type="text"
          .value=${value}
          placeholder="inherit"
          @change=${(e: Event) => this.setButton(i, key, (e.target as HTMLInputElement).value.trim())}
        />
      </span>
    </div>`;
  }

  private iconField(i: number) {
    const value = this.working.buttons[i].icon ?? "";
    if (customElements.get("ha-icon-picker")) {
      return html`<label class="field">
        <span class="label">Icon</span>
        <ha-icon-picker
          .hass=${hass()}
          .value=${value}
          @value-changed=${(e: CustomEvent) => this.setButton(i, "icon", e.detail.value ?? "")}
        ></ha-icon-picker>
      </label>`;
    }
    return html`<label class="field">
      <span class="label">Icon <a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener">browse</a></span>
      <span class="colour">
        <ha-icon .icon=${value}></ha-icon>
        <input
          type="text"
          .value=${value}
          placeholder="mdi:home"
          @change=${(e: Event) => this.setButton(i, "icon", (e.target as HTMLInputElement).value.trim())}
        />
      </span>
    </label>`;
  }

  private renderButtonForm(b: DockbarButton, i: number) {
    return html`
      <div class="button-form">
        <div class="grid">
          ${this.buttonText(i, "Name", "name")} ${this.iconField(i)}
          <label class="field">
            <span class="label">Does</span>
            <select @change=${(e: Event) => this.setButton(i, "action", (e.target as HTMLSelectElement).value)}>
              ${ACTIONS.map((a) => html`<option value=${a} ?selected=${a === b.action}>${ACTION_LABELS[a]}</option>`)}
            </select>
          </label>
          ${b.action === "navigate"
            ? this.buttonText(i, "Page", "path", { list: "dockbar-paths", placeholder: "/lovelace/0" })
            : nothing}
          ${b.action === "url" ? this.buttonText(i, "Link", "url", { placeholder: "https://…" }) : nothing}
        </div>
        <h4>Live value <span class="hint">shows an entity's state on the button</span></h4>
        <div class="grid">
          ${this.buttonText(i, "Entity", "entity", { list: "dockbar-entities", placeholder: "sensor.pv_power" })}
          ${this.buttonText(i, "Attribute", "attribute", { list: `dockbar-attrs-${i}`, placeholder: "blank = state" })}
          ${b.entity
            ? html`<div class="field">
                <span class="label">Shows</span>
                <span class="preview-value">${entityText(b.entity, b.attribute) ?? "entity not found"}</span>
              </div>`
            : nothing}
          ${b.entity ? this.buttonColour(i, "Value colour", "state_color") : nothing}
        </div>
        <datalist id=${`dockbar-attrs-${i}`}>
          ${Object.keys((b.entity && hass()?.states[b.entity]?.attributes) || {}).map((a) => html`<option value=${a}></option>`)}
        </datalist>
        <h4>Style for this button <span class="hint">blank = use "Every button"</span></h4>
        <div class="grid">
          ${this.buttonColour(i, "Icon colour", "icon_color")} ${this.buttonColour(i, "Name colour", "name_color")}
          ${this.buttonColour(i, "Background", "background")} ${this.buttonText(i, "Border", "border", { placeholder: "inherit" })}
        </div>
      </div>
    `;
  }

  /** Adds buttons from a pasted YAML list, giving any clashing ids a new one. */
  private importButtons() {
    const warnings: string[] = [];
    let raw: unknown;
    try {
      raw = load(this.importText);
    } catch (err: any) {
      this.importMsg = `Not valid YAML: ${err.message}`;
      return;
    }
    const list = Array.isArray(raw) ? raw : (raw as { buttons?: unknown })?.buttons;
    const parsed = sanitiseLayer({ buttons: list ?? [] }, (m) => warnings.push(m)).buttons ?? [];
    const taken = new Set([...this.working.buttons, ...this.lower.buttons].map((b) => b.id));
    const added = parsed.map((b) => ({ ...b, id: taken.has(b.id) ? uniqueId(b.name ?? b.id, taken) : (taken.add(b.id), b.id) }));
    if (added.length) {
      this.working.buttons = [...this.working.buttons, ...added];
      this.changed();
      this.importText = "";
    }
    this.importMsg = [`Added ${added.length} button${added.length === 1 ? "" : "s"}.`, ...warnings].join(" ");
  }

  private renderButtons() {
    const lowerIds = new Map(this.lower.buttons.map((b) => [b.id, b]));
    const removed = this.lower.buttons.filter((b) => !this.working.buttons.some((w) => w.id === b.id));
    const n = this.working.buttons.length;
    return html`
      <ul class=${this.dragId ? "buttons sorting" : "buttons"}>
        ${this.working.buttons.map((b, i) => {
          const base = lowerIds.get(b.id);
          const tag = this.scope === "shared" ? "" : !base ? "added" : JSON.stringify(base) !== JSON.stringify(b) ? "changed" : "";
          const open = this.expanded === b.id;
          // Only the level a button was added at can delete it; levels above can hide it.
          const deletable = this.scope === "shared" || !base;
          return html`<li class=${[open ? "open" : "", this.dragId === b.id ? "dragging" : "", b.hidden ? "is-hidden" : ""].join(" ")}>
            <div class="row">
              <span
                class="handle"
                title="Drag to reorder"
                @pointerdown=${(e: PointerEvent) => this.dragStart(e, b.id)}
                @pointermove=${(e: PointerEvent) => this.dragMove(e)}
                @pointerup=${() => this.dragEnd()}
                @pointercancel=${() => this.dragEnd()}
              >⠿</span>
              <ha-icon .icon=${b.icon ?? ""} style="color:${b.icon_color ?? "inherit"}"></ha-icon>
              <button class="title" @click=${() => (this.expanded = open ? null : b.id)}>
                <strong>${b.name || "(no name)"}</strong>
                <span>${b.action === "navigate" ? b.path : b.action === "url" ? b.url : ACTION_LABELS[b.action]}</span>
              </button>
              ${b.hidden ? html`<span class="tag">hidden</span>` : nothing} ${tag ? html`<span class="tag">${tag}</span>` : nothing}
              <button class="icon" title="Move up" ?disabled=${i === 0} @click=${() => this.moveButton(i, -1)}>▲</button>
              <button class="icon" title="Move down" ?disabled=${i === n - 1} @click=${() => this.moveButton(i, 1)}>▼</button>
              <button class="icon" title=${b.hidden ? "Show on the bar" : "Hide from the bar"} @click=${() => this.toggleHidden(i)}>
                <ha-icon .icon=${b.hidden ? "mdi:eye-off" : "mdi:eye"}></ha-icon>
              </button>
              ${deletable
                ? html`<button class="icon danger" title="Delete" @click=${() => this.removeButton(i)}>
                    <ha-icon icon="mdi:delete"></ha-icon>
                  </button>`
                : html`<span class="icon spacer"></span>`}
            </div>
            ${open ? this.renderButtonForm(b, i) : nothing}
          </li>`;
        })}
      </ul>
      <button class="add" @click=${() => this.addButton()}>+ Add button</button>
      <details class="import">
        <summary>Import buttons from YAML</summary>
        <textarea
          rows="6"
          spellcheck="false"
          placeholder="- name: HACS&#10;  icon: mdi:store&#10;  path: /hacs&#10;  icon_color: '#41BDF5'"
          .value=${this.importText}
          @input=${(e: Event) => (this.importText = (e.target as HTMLTextAreaElement).value)}
        ></textarea>
        <div class="import-row">
          <span class="hint">${this.importMsg}</span>
          <button class="text" ?disabled=${!this.importText.trim()} @click=${() => this.importButtons()}>Import</button>
        </div>
      </details>
      ${removed.length
        ? html`<section>
            <h3>Removed here</h3>
            <div class="chips">
              ${removed.map(
                (b) => html`<button class="chip" title="Show again" @click=${() => this.addButton(clone(b))}>
                  <ha-icon .icon=${b.icon ?? ""}></ha-icon> ${b.name} ↺
                </button>`,
              )}
            </div>
          </section>`
        : nothing}
    `;
  }

  // ---------------------------------------------------------------- shell

  render() {
    if (!this.working) return nothing;
    const scopeInfo = SCOPES.find((s) => s.scope === this.scope)!;
    return html`
      <div class="scrim" @click=${() => this.close()}></div>
      <div
        class="dialog"
        role="dialog"
        aria-label="Dockbar settings"
        @keydown=${(e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.key === "Escape") this.close();
        }}
      >
        <header>
          <h2>Dockbar settings</h2>
          <button class="icon" title="Close" @click=${() => this.close()}>✕</button>
        </header>
        <div class="scopes" role="tablist">
          ${SCOPES.map(
            (s) => html`<button
              role="tab"
              aria-selected=${s.scope === this.scope}
              ?disabled=${s.scope === "shared" && !this.host_.isAdmin}
              title=${s.hint}
              @click=${() => this.switchScope(s.scope)}
            >
              ${s.label}
            </button>`,
          )}
        </div>
        <p class="hint scope-hint">
          ${scopeInfo.hint} ${this.scope !== "shared" ? html`<strong>●</strong> marks a setting changed at this level.` : nothing}
        </p>
        ${this.scope === "shared" && this.host_.usingYaml
          ? html`<p class="banner">
              Currently using <code>www/dockbar/config.yaml</code>. Saving here moves the config into Home Assistant, and the
              YAML file is ignored from then on.
            </p>`
          : nothing}
        <nav class="tabs">
          <button aria-selected=${this.tab === "general"} @click=${() => (this.tab = "general")}>General</button>
          <button aria-selected=${this.tab === "buttons"} @click=${() => (this.tab = "buttons")}>
            Buttons (${this.working.buttons.length})
          </button>
        </nav>
        <main>${this.tab === "general" ? this.renderGeneral() : this.renderButtons()}</main>
        <datalist id="dockbar-paths">
          ${this.targets.map((t) => html`<option value=${t.path}>${t.label}</option>`)}
        </datalist>
        ${this.tab === "buttons" && this.expanded
          ? html`<datalist id="dockbar-entities">${entityIds().map((id) => html`<option value=${id}></option>`)}</datalist>`
          : nothing}
        <footer>
          ${this.scope !== "shared"
            ? html`<button class="text danger" @click=${() => this.resetScope()}>Reset "${scopeInfo.label}"</button>`
            : nothing}
          <span class="error">${this.error}</span>
          <button class="text" @click=${() => this.close()}>Cancel</button>
          <button class="primary" ?disabled=${!this.dirty || this.saving} @click=${() => this.save()}>
            ${this.saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    `;
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9;
      display: grid;
      place-items: center;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      color: var(--primary-text-color);
      --db-ed-bg: var(--card-background-color, #1c1c1c);
      --db-ed-line: var(--divider-color, rgba(255, 255, 255, 0.12));
      --db-ed-input: var(--secondary-background-color, #2a2a2a);
      --db-ed-accent: var(--primary-color, #03a9f4);
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
    }
    .dialog {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(760px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      background: var(--db-ed-bg);
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    @media (max-width: 600px) {
      .dialog {
        width: 100vw;
        max-height: 100vh;
        height: 100vh;
        border-radius: 0;
      }
    }
    header,
    footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
    }
    header h2 {
      flex: 1;
      margin: 0;
      font-size: 1.2rem;
      font-weight: 500;
    }
    footer {
      border-top: 1px solid var(--db-ed-line);
    }
    .error {
      flex: 1;
      color: var(--error-color, #f44336);
      font-size: 0.85rem;
    }
    main {
      flex: 1;
      overflow: auto;
      padding: 8px 16px 16px;
    }
    h3 {
      margin: 16px 0 8px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--secondary-text-color);
    }
    h4 {
      margin: 12px 0 6px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--secondary-text-color);
    }
    .label a {
      color: var(--db-ed-accent);
    }
    .hint {
      font-size: 0.75rem;
      color: var(--secondary-text-color);
      opacity: 0.8;
    }
    .hint.warn {
      color: var(--warning-color, #ff9800);
      opacity: 1;
    }
    .scope-hint {
      margin: 0;
      padding: 6px 16px 0;
    }
    .banner {
      margin: 8px 16px 0;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      background: rgba(255, 152, 0, 0.12);
      border: 1px solid rgba(255, 152, 0, 0.35);
    }
    input[type="text"],
    input[type="number"],
    select,
    textarea {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid var(--db-ed-line);
      border-radius: 8px;
      background: var(--db-ed-input);
      color: inherit;
      font: inherit;
      font-size: 0.9rem;
    }
    textarea {
      font-family: ui-monospace, monospace;
      resize: vertical;
    }
    input:focus,
    select:focus,
    textarea:focus {
      outline: 2px solid var(--db-ed-accent);
      outline-offset: -1px;
    }
    input[type="color"] {
      flex: 0 0 36px;
      height: 36px;
      padding: 0;
      border: 1px solid var(--db-ed-line);
      border-radius: 8px;
      background: none;
      cursor: pointer;
    }
    .switch {
      width: 20px;
      height: 20px;
      accent-color: var(--db-ed-accent);
    }
    .colour {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .colour ha-icon {
      flex: 0 0 auto;
    }
    button {
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    button:disabled {
      cursor: default;
      opacity: 0.4;
    }
    .reset {
      border: none;
      background: none;
      padding: 0;
      font-size: 0.75rem;
      color: var(--db-ed-accent);
    }
    .icon {
      border: none;
      background: none;
      padding: 6px 8px;
      border-radius: 8px;
    }
    .icon:hover:not(:disabled) {
      background: var(--db-ed-input);
    }
    .icon ha-icon {
      --mdc-icon-size: 18px;
      display: block;
    }
    .icon.spacer {
      width: 18px;
    }
    .buttons li.is-hidden .row > ha-icon,
    .buttons li.is-hidden .title {
      opacity: 0.45;
    }
    .danger {
      color: var(--error-color, #f44336);
    }
    .text,
    .primary,
    .add {
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid var(--db-ed-line);
      background: none;
    }
    .primary {
      border-color: var(--db-ed-accent);
      background: var(--db-ed-accent);
      color: var(--text-primary-color, #fff);
    }
    .add {
      margin-top: 8px;
      width: 100%;
      border-style: dashed;
    }
    .scopes,
    .tabs {
      display: flex;
      gap: 4px;
      padding: 0 16px;
    }
    .scopes button {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--db-ed-line);
      background: none;
      border-radius: 8px;
    }
    .scopes button[aria-selected="true"] {
      border-color: var(--db-ed-accent);
      background: color-mix(in srgb, var(--db-ed-accent) 18%, transparent);
    }
    .tabs {
      margin-top: 12px;
      border-bottom: 1px solid var(--db-ed-line);
    }
    .tabs button {
      padding: 8px 12px;
      border: none;
      background: none;
      border-bottom: 2px solid transparent;
    }
    .tabs button[aria-selected="true"] {
      border-bottom-color: var(--db-ed-accent);
      color: var(--db-ed-accent);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid var(--db-ed-line);
      border-radius: 16px;
      background: none;
      font-size: 0.85rem;
      --mdc-icon-size: 18px;
    }
    .buttons {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .buttons li {
      border: 1px solid var(--db-ed-line);
      border-radius: 10px;
    }
    .buttons li.dragging {
      border-color: var(--db-ed-accent);
      background: color-mix(in srgb, var(--db-ed-accent) 12%, transparent);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .buttons.sorting {
      user-select: none;
      cursor: grabbing;
    }
    .handle {
      cursor: grab;
      touch-action: none;
      padding: 6px 2px;
      font-size: 1.1rem;
      color: var(--secondary-text-color);
    }
    .sorting .handle {
      cursor: grabbing;
    }
    .buttons li.open {
      border-color: var(--db-ed-accent);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 4px 4px 6px;
    }
    .row .title {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      border: none;
      background: none;
      padding: 6px;
      text-align: left;
    }
    .row .title span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.8rem;
      color: var(--secondary-text-color);
    }
    .tag {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--db-ed-accent) 20%, transparent);
    }
    .button-form {
      padding: 4px 12px 12px;
      border-top: 1px solid var(--db-ed-line);
    }
    code {
      font-size: 0.85em;
    }
    .range {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .range input {
      flex: 1;
      min-width: 0;
      accent-color: var(--db-ed-accent);
    }
    .range output {
      min-width: 3.5ch;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .chip code {
      font-size: 0.85rem;
    }
    .chip-x {
      border: none;
      background: none;
      padding: 0 2px;
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    .preview-value {
      padding: 8px 0;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .import {
      margin-top: 12px;
    }
    .import summary {
      cursor: pointer;
      font-size: 0.85rem;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }
    .import-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 6px;
    }
  `;
}
