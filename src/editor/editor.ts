import { LitElement, html, nothing } from "lit";
import { type DockbarConfig, type Layer } from "../config.ts";
import { clone, diffLayer } from "../merge.ts";
import { groupOrder } from "../sections.ts";
import { entityIds, navTargets, type NavTarget } from "../ha.ts";
import { type Scope } from "../storage.ts";
import { SCOPES, getPath, setPath } from "./constants.ts";
import { editorStyles } from "./styles.ts";
import { renderGeneral } from "./tab-general.ts";
import { yamlFromWorking, renderAdvanced } from "./tab-advanced.ts";
import { renderButtons } from "./tab-buttons.ts";

export interface EditorHost {
  isAdmin: boolean;
  /** Shared config is empty and config.yaml is being used as the base. */
  usingYaml: boolean;
  /** Nothing saved yet: the buttons mirror the viewer's HA sidebar. */
  usingSidebar: boolean;
  lowerFor(scope: Scope): DockbarConfig;
  workingFor(scope: Scope): DockbarConfig;
  preview(scope: Scope, layer: Layer | null): void;
  save(scope: Scope, layer: Layer): Promise<void>;
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
    yamlText: { state: true },
    yamlMsg: { state: true },
    dragId: { state: true },
    hideOnDraft: { state: true },
  };

  declare host_: EditorHost;
  declare scope: Scope;
  declare tab: "general" | "buttons" | "advanced";
  declare yamlText: string;
  declare yamlMsg: string;
  declare working: DockbarConfig;
  declare expanded: string | null;
  declare saving: boolean;
  declare error: string;
  declare targets: NavTarget[];
  declare importText: string;
  declare importMsg: string;
  declare dragId: string | null;
  declare hideOnDraft: string;
  lower!: DockbarConfig;
  pristine = "";

  constructor() {
    super();
    this.tab = "general";
    this.expanded = null;
    this.saving = false;
    this.error = "";
    this.targets = [];
    this.importText = "";
    this.importMsg = "";
    this.yamlText = "";
    this.yamlMsg = "";
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
    this.working.buttons = groupOrder(this.working.buttons);
    this.pristine = JSON.stringify(this.working);
    this.expanded = null;
    this.error = "";
  }

  private get dirty() {
    return JSON.stringify(this.working) !== this.pristine;
  }

  /** A first-run list can be saved as it is, to keep it for everyone. */
  private get canSave() {
    return this.dirty || (this.scope === "shared" && this.host_.usingSidebar);
  }

  layer(): Layer {
    return diffLayer(this.lower, this.working, this.scope === "shared");
  }

  private previewFrame = 0;

  changed() {
    this.working = { ...this.working };
    // Sliders and colour pickers fire many times a frame; preview once per frame.
    if (this.previewFrame) return;
    this.previewFrame = requestAnimationFrame(() => {
      this.previewFrame = 0;
      this.host_.preview(this.scope, this.layer());
    });
  }

  /** Drops the live preview, including one still waiting for its frame. */
  private clearPreview() {
    cancelAnimationFrame(this.previewFrame);
    this.previewFrame = 0;
    this.host_.preview(this.scope, null);
  }

  set(path: string, value: unknown) {
    // Clearing a field means "inherit", not "empty".
    if (value === "" || value === undefined) value = clone(getPath(this.lower, path) ?? null) ?? undefined;
    setPath(this.working, path, value);
    this.changed();
  }

  openAdvanced() {
    this.tab = "advanced";
    this.yamlText = yamlFromWorking(this);
    this.yamlMsg = "";
  }

  private switchScope(scope: Scope) {
    if (scope === this.scope) return;
    if (this.dirty && !confirm("Discard unsaved changes?")) return;
    this.clearPreview();
    this.loadScope(scope);
    if (this.tab === "advanced") this.openAdvanced();
  }

  private close() {
    if (this.dirty && !confirm("Discard unsaved changes?")) return;
    this.clearPreview();
    this.remove();
  }

  private async save() {
    this.saving = true;
    this.error = "";
    try {
      await this.host_.save(this.scope, this.layer());
      this.clearPreview();
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
        ${this.host_.usingSidebar
          ? html`<p class="banner">
              These buttons are copied from your Home Assistant sidebar, so everyone sees their own until an admin saves under
              <strong>Everyone</strong>. Saving keeps this list for all users.
            </p>`
          : nothing}
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
          <button aria-selected=${this.tab === "advanced"} @click=${() => this.openAdvanced()}>Advanced</button>
        </nav>
        <main>
          ${this.tab === "general" ? renderGeneral(this) : this.tab === "buttons" ? renderButtons(this) : renderAdvanced(this)}
        </main>
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
          <button class="primary" ?disabled=${!this.canSave || this.saving} @click=${() => this.save()}>
            ${this.saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    `;
  }

  static styles = editorStyles;
}
