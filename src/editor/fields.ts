import { html, nothing, type TemplateResult } from "lit";
import { STYLE_KEYS, type ButtonStyle } from "../config.ts";
import { clone } from "../merge.ts";
import { STYLE_LABELS, COLOUR_KEYS, getPath, asHex } from "./constants.ts";
import type { DockbarEditor } from "./editor.ts";

export function field(ed: DockbarEditor, label: string, path: string, control: TemplateResult, hint?: string) {
  const overridden = JSON.stringify(getPath(ed.working, path)) !== JSON.stringify(getPath(ed.lower, path));
  return html`
    <div class="field">
      <span class="label">
        ${label}
        ${overridden
          ? html`<button
              class="reset"
              title="Changed here. Click to go back to ${JSON.stringify(getPath(ed.lower, path)) ?? "default"}"
              @click=${(e: Event) => {
                e.preventDefault();
                ed.set(path, clone(getPath(ed.lower, path)));
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

export function text(ed: DockbarEditor, label: string, path: string, hint?: string, placeholder = "") {
  return field(ed, 
    label,
    path,
    html`<input
      type="text"
      .value=${getPath(ed.working, path) ?? ""}
      placeholder=${placeholder}
      @change=${(e: Event) => ed.set(path, (e.target as HTMLInputElement).value.trim())}
    />`,
    hint,
  );
}

export function number(ed: DockbarEditor, label: string, path: string, hint?: string) {
  return field(ed, 
    label,
    path,
    html`<input
      type="number"
      min="0"
      .value=${String(getPath(ed.working, path) ?? "")}
      @change=${(e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        ed.set(path, v === "" ? null : Number(v));
      }}
    />`,
    hint,
  );
}

export function toggle(ed: DockbarEditor, label: string, path: string, hint?: string) {
  return field(ed, 
    label,
    path,
    html`<input
      type="checkbox"
      class="switch"
      .checked=${Boolean(getPath(ed.working, path))}
      @change=${(e: Event) => ed.set(path, (e.target as HTMLInputElement).checked)}
    />`,
    hint,
  );
}

export function select(ed: DockbarEditor, label: string, path: string, options: [string, string][]) {
  const value = getPath(ed.working, path) ?? "none";
  return field(ed, 
    label,
    path,
    html`<select
      @change=${(e: Event) => {
        const v = (e.target as HTMLSelectElement).value;
        ed.set(path, v === "none" ? null : v);
      }}
    >
      ${options.map(([v, l]) => html`<option value=${v} ?selected=${v === value}>${l}</option>`)}
    </select>`,
  );
}

export function range(ed: DockbarEditor, label: string, path: string, hint?: string) {
  const value = getPath(ed.working, path) as number | null | undefined;
  const shown = value ?? 100;
  return field(ed, 
    label,
    path,
    html`<span class="range">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        .value=${String(shown)}
        @input=${(e: Event) => ed.set(path, Number((e.target as HTMLInputElement).value))}
      />
      <output>${shown}%</output>
    </span>`,
    hint,
  );
}

export function colour(ed: DockbarEditor, label: string, path: string, hint?: string) {
  const value = getPath(ed.working, path) ?? "";
  return field(ed, 
    label,
    path,
    html`<span class="colour">
      <input
        type="color"
        .value=${asHex(value)}
        @input=${(e: Event) => ed.set(path, (e.target as HTMLInputElement).value)}
      />
      <input
        type="text"
        .value=${value}
        placeholder="#9C88FF, rgba(…), var(--…)"
        @change=${(e: Event) => ed.set(path, (e.target as HTMLInputElement).value.trim())}
      />
    </span>`,
    hint,
  );
}

export function styleFields(ed: DockbarEditor, prefix: string, keys: (keyof ButtonStyle)[] = STYLE_KEYS) {
  return keys.map((k) =>
    COLOUR_KEYS.has(k) ? colour(ed, STYLE_LABELS[k], `${prefix}.${k}`) : text(ed, STYLE_LABELS[k], `${prefix}.${k}`),
  );
}

/** A plain select whose values are stored as they are (no "none" means inherit). */
export function choice(ed: DockbarEditor, label: string, path: string, options: [string, string][], hint?: string) {
  const value = String(getPath(ed.working, path) ?? "");
  const known = options.some(([v]) => v === value);
  return field(ed, 
    label,
    path,
    html`<select @change=${(e: Event) => ed.set(path, (e.target as HTMLSelectElement).value)}>
      ${known ? nothing : html`<option value=${value} selected>Custom (set in YAML)</option>`}
      ${options.map(([v, l]) => html`<option value=${v} ?selected=${v === value}>${l}</option>`)}
    </select>`,
    hint,
  );
}
