import { html } from "lit";
import { dump, load } from "js-yaml";
import { sanitiseLayer, type Layer } from "../config.ts";
import { merge } from "../merge.ts";
import { groupOrder } from "../sections.ts";
import { SCOPES } from "./constants.ts";
import { field } from "./fields.ts";
import type { DockbarEditor } from "./editor.ts";

export function yamlFromWorking(ed: DockbarEditor) {
  const layer = ed.layer();
  return Object.keys(layer).length ? dump(layer, { lineWidth: 120, noRefs: true }) : "";
}

/** Replaces this level with the YAML, previewed live. */
export function applyYaml(ed: DockbarEditor) {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = load(ed.yamlText) ?? {};
  } catch (err: any) {
    ed.yamlMsg = `Not valid YAML: ${err.message}`;
    return;
  }
  const layer = sanitiseLayer(raw, (m) => warnings.push(m));
  // The level below, with this level's YAML on top: the same way the bar builds it.
  const working = merge([ed.lower as unknown as Layer, layer]);
  working.buttons = groupOrder(working.buttons);
  ed.working = working;
  ed.changed();
  ed.yamlMsg = warnings.length ? `Applied, but ignored: ${warnings.join("; ")}` : "Applied. Click Save to keep it.";
}

export function renderAdvanced(ed: DockbarEditor) {
  const scopeLabel = SCOPES.find((s) => s.scope === ed.scope)!.label;
  return html`
    <section>
      <h3>YAML for "${scopeLabel}"</h3>
      <p class="hint">
        Everything this level changes, as YAML. Edit any setting, including ones the other tabs don't show (for example a
        custom <code>shadow</code> like <code>0 0 20px #9C88FF</code>), then click Apply to preview.
        ${ed.scope === "shared"
          ? "This level holds the full button list."
          : "Buttons from the levels below appear under button_overrides."}
      </p>
      <textarea
        class="yaml"
        rows="18"
        spellcheck="false"
        .value=${ed.yamlText}
        @input=${(e: Event) => (ed.yamlText = (e.target as HTMLTextAreaElement).value)}
      ></textarea>
      <div class="import-row">
        <span class="hint">${ed.yamlMsg}</span>
        <span>
          <button class="text" @click=${() => ((ed.yamlText = yamlFromWorking(ed)), (ed.yamlMsg = ""))}>Reload</button>
          <button class="text" @click=${() => applyYaml(ed)}>Apply</button>
        </span>
      </div>
    </section>
    <section>
      <h3>Custom CSS</h3>
      ${field(ed, 
        "Injected into the bar",
        "style",
        html`<textarea
          rows="5"
          spellcheck="false"
          .value=${ed.working.style}
          placeholder=".btn.active { box-shadow: 0 0 12px #9C88FF; }"
          @change=${(e: Event) => ed.set("style", (e.target as HTMLTextAreaElement).value)}
        ></textarea>`,
        "Parts you can target: bar, button, active, alert, badge, state, children, footer",
      )}
    </section>
  `;
}
