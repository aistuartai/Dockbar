import { html, nothing } from "lit";
import { FOOTER_TOOLS, POSITIONS, STYLE_KEYS, ACTIVE_INDICATORS, HOVER_EFFECTS } from "../config.ts";
import { clone } from "../merge.ts";
import { PRESETS, applyPreset, captureLook, savedPreset } from "../presets.ts";
import { FOOTER_LABELS, INDICATOR_LABELS, HOVER_LABELS, SHADOW_CHOICES } from "./constants.ts";
import { text, number, toggle, select, range, colour, styleFields, choice } from "./fields.ts";
import type { DockbarEditor } from "./editor.ts";

export function addHideOn(ed: DockbarEditor) {
  const raw = ed.hideOnDraft.trim();
  if (!raw) return;
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const list = ed.working.hide_on;
  if (!list.includes(path)) ed.set("hide_on", [...list, path]);
  ed.hideOnDraft = "";
}

export function renderHideOn(ed: DockbarEditor) {
  const list = ed.working.hide_on;
  const changed = JSON.stringify(list) !== JSON.stringify(ed.lower.hide_on);
  return html`<section>
    <h3>Hide the bar on</h3>
    <div class="field">
      <span class="label">
        Dashboards or views
        ${changed
          ? html`<button class="reset" @click=${() => ed.set("hide_on", clone(ed.lower.hide_on))}>● reset</button>`
          : nothing}
      </span>
      ${list.length
        ? html`<div class="chips">
            ${list.map(
              (p) => html`<span class="chip">
                <code>${p}</code>
                <button class="chip-x" title="Remove" aria-label="Remove ${p}" @click=${() => ed.set("hide_on", list.filter((x) => x !== p))}>✕</button>
              </span>`,
            )}
          </div>`
        : nothing}
      <span class="colour">
        <input
          type="text"
          list="dockbar-paths"
          placeholder="/wall-panel"
          .value=${ed.hideOnDraft}
          @input=${(e: Event) => (ed.hideOnDraft = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => e.key === "Enter" && addHideOn(ed)}
        />
        <button class="text" ?disabled=${!ed.hideOnDraft.trim()} @click=${() => addHideOn(ed)}>Add</button>
      </span>
      <span class="hint">
        A dashboard path covers all its views. The bar is hidden and its space given back; HA's sidebar and header stay as
        set above. For a wall tablet, add it under <strong>This device</strong> on that tablet.
      </span>
    </div>
  </section>`;
}

export function renderGeneral(ed: DockbarEditor) {
  const positions: [string, string][] = POSITIONS.map((p) => [p, p[0].toUpperCase() + p.slice(1)]);
  const footer = ed.working.footer;
  return html`
    ${renderLook(ed)}
    <section>
      <h3>Layout</h3>
      <div class="grid">
        ${select(ed, "Position", "position", positions)}
        ${select(ed, "On phones", "mobile_position", [["none", "Same as position"], ...positions, ["hidden", "Hidden"]])}
        ${number(ed, "Phone width below", "mobile_breakpoint", "px")}
        ${ed.working.mobile_position === "hidden"
          ? nothing
          : number(ed, "Phone bar thickness", "mobile_size", "px, blank = same as Bar thickness")}
        ${number(ed, "Bar thickness", "size", "px")} ${number(ed, "Padding", "padding", "px")}
        ${number(ed, "Gap", "gap", "px")}
        ${number(ed, "Button length", "button_length", "px, blank = square")}
        ${number(ed, "Smallest button", "button_min_length", "px, then the bar scrolls")}
      </div>
    </section>
    <section>
      <h3>Home Assistant</h3>
      <div class="grid">
        ${toggle(ed, "Hide HA sidebar", "hide_sidebar", "The Menu button still opens it")}
        ${toggle(ed, "Hide dashboard header", "hide_header", "Comes back when editing a dashboard")}
        ${toggle(ed, "Show button names", "show_names")}
        ${ed.scope === "shared"
          ? toggle(ed, "Add new dashboards automatically", "auto_add_dashboards", "A button for each dashboard you create from now on appears at the end of the bar")
          : nothing}
      </div>
    </section>
    ${renderHideOn(ed)}
    <section>
      <h3>Pinned buttons</h3>
      <div class="field">
        <span class="label">
          Shown at the end of the bar
          ${JSON.stringify(footer) !== JSON.stringify(ed.lower.footer)
            ? html`<button class="reset" @click=${() => ed.set("footer", clone(ed.lower.footer))}>● reset</button>`
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
                  ed.set("footer", FOOTER_TOOLS.filter((x) => (x === t ? on : footer.includes(x))));
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
        ${colour(ed, "Background", "background")}
        ${range(ed, "Background opacity", "background_opacity", "100% = the colour as written")}
        ${text(ed, "Backdrop filter", "backdrop_filter", "e.g. blur(8px)")}
      </div>
    </section>
    <section>
      <h3>Every button</h3>
      <div class="grid">${styleFields(ed, "defaults", STYLE_KEYS.filter((k) => k !== "shadow"))}</div>
    </section>
    <section>
      <h3>Current page's button</h3>
      <div class="grid">${styleFields(ed, "active", ["background", "border", "icon_color", "name_color"])}</div>
    </section>
    <section>
      <h3>Button with a badge <span class="hint">while it shows a count, e.g. notifications or updates</span></h3>
      <div class="grid">${styleFields(ed, "alert", ["icon_color", "background", "border", "name_color", "badge_color"])}</div>
    </section>
  `;
}

export function applyLook(ed: DockbarEditor, key: string) {
  ed.working = applyPreset(ed.working, PRESETS[key]);
  ed.changed();
}

export function applySaved(ed: DockbarEditor, name: string) {
  ed.working = applyPreset(ed.working, savedPreset(name, ed.working.custom_presets[name]));
  ed.changed();
}

export function saveLook(ed: DockbarEditor) {
  const name = prompt("Name for this look", "My look")?.trim().slice(0, 40);
  if (!name) return;
  if (name in ed.working.custom_presets && !confirm(`Replace the saved look "${name}"?`)) return;
  ed.working.custom_presets = { ...ed.working.custom_presets, [name]: captureLook(ed.working) };
  ed.changed();
}

export function deleteLook(ed: DockbarEditor, name: string) {
  if (!confirm(`Delete the saved look "${name}"?`)) return;
  const { [name]: _, ...rest } = ed.working.custom_presets;
  ed.working.custom_presets = rest;
  ed.changed();
}

/** A look shared from a lower level can't be deleted here, but a change to it can be undone. */
export function revertLook(ed: DockbarEditor, name: string) {
  ed.working.custom_presets = { ...ed.working.custom_presets, [name]: clone(ed.lower.custom_presets[name]) };
  ed.changed();
}

export function lookChip(ed: DockbarEditor, name: string) {
  const shared = ed.lower.custom_presets[name];
  const action = !shared
    ? html`<button class="chip-x" title="Delete" aria-label="Delete saved look ${name}" @click=${() => deleteLook(ed, name)}>✕</button>`
    : JSON.stringify(shared) !== JSON.stringify(ed.working.custom_presets[name])
      ? html`<button class="chip-x" title="Undo your change to this look" aria-label="Undo your change to ${name}" @click=${() => revertLook(ed, name)}>↺</button>`
      : nothing;
  return html`<span class="chip saved">
    <button class="chip-label" title="Apply this saved look" @click=${() => applySaved(ed, name)}>${name}</button>
    ${action}
  </span>`;
}

export function renderLook(ed: DockbarEditor) {
  return html`<section>
    <h3>Look</h3>
    <div class="field">
      <span class="label">Start from a preset</span>
      <div class="chips">
        ${Object.entries(PRESETS).map(
          ([key, p]) => html`<button class="chip" title=${p.description} @click=${() => applyLook(ed, key)}>${p.label}</button>`,
        )}
      </div>
      <span class="label">Your saved looks</span>
      <div class="chips">
        ${Object.keys(ed.working.custom_presets).map((name) => lookChip(ed, name))}
        <button class="chip add-look" title="Save the current look under a name" @click=${() => saveLook(ed)}>
          + Save current look
        </button>
      </div>
      <span class="hint">
        Sets the bar and button styles below; your buttons and their own colours stay. Nothing is saved until you click Save.
        Saved looks belong to the level you're editing: under Everyone they're offered to all users.
      </span>
    </div>
    <div class="grid">
      ${choice(ed, 
        "Current page shown as",
        "active_indicator",
        ACTIVE_INDICATORS.map((v) => [v, INDICATOR_LABELS[v]]),
      )}
      ${colour(ed, "Indicator colour", "indicator_color", "Line, pill, dot and glow")}
      ${choice(ed, "Hover effect", "hover_effect", HOVER_EFFECTS.map((v) => [v, HOVER_LABELS[v]]))}
      ${choice(ed, "Button shadow", "defaults.shadow", SHADOW_CHOICES)}
    </div>
  </section>`;
}
