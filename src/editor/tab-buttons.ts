import { html, nothing } from "lit";
import { dump, load } from "js-yaml";
import { ACTIONS, BADGE_SOURCES, sanitiseLayer, uniqueId, type ButtonStyle, type DockbarButton } from "../config.ts";
import { clone, same } from "../merge.ts";
import { badgeSource } from "../match.ts";
import { childrenOf, groupOrder, isSection, moveWithin, parentOf } from "../sections.ts";
import { actionProblem } from "../actions.ts";
import { attributeOptions, entityOptions, entityText, hass, serviceOptions } from "../ha.ts";
import type { PickerOption } from "../search.ts";
import { ACTION_LABELS, BADGE_LABELS, HA_BUTTONS, asHex } from "./constants.ts";
import type { DockbarEditor } from "./editor.ts";

/** Sets a button field to any value; undefined removes it. */
function setButtonValue(ed: DockbarEditor, i: number, key: keyof DockbarButton, value: unknown) {
  const b = { ...ed.working.buttons[i] } as Record<string, unknown>;
  if (value === undefined) delete b[key];
  else b[key] = value;
  ed.working.buttons = ed.working.buttons.map((x, n) => (n === i ? (b as unknown as DockbarButton) : x));
  ed.changed();
}

/** The entities an action acts on, as removable chips with a search box to add more. */
function targetField(ed: DockbarEditor, i: number) {
  const target = ed.working.buttons[i].target;
  const list = Array.isArray(target) ? target : target ? [target] : [];
  const save = (next: string[]) => setButtonValue(ed, i, "target", next.length === 0 ? undefined : next.length === 1 ? next[0] : next);
  return html`<div class="field">
    <span class="label">Target entity</span>
    ${list.length
      ? html`<div class="chips">
          ${list.map(
            (t) => html`<span class="chip">
              <code>${t}</code>
              <button class="chip-x" title="Remove" aria-label="Remove ${t}" @click=${() => save(list.filter((x) => x !== t))}>✕</button>
            </span>`,
          )}
        </div>`
      : nothing}
    <dockbar-picker
      clear-on-pick
      label="Add a target entity"
      placeholder="Search entities to add"
      .options=${entityOptions}
      @pick=${(e: CustomEvent<string>) => {
        const added = e.detail.trim();
        if (added && !list.includes(added)) save([...list, added]);
      }}
    ></dockbar-picker>
  </div>`;
}

/** Extra data for an action, edited as YAML. */
function dataField(ed: DockbarEditor, i: number) {
  const data = ed.working.buttons[i].data;
  return html`<label class="field">
    <span class="label">Data (YAML)</span>
    <textarea
      rows="3"
      spellcheck="false"
      placeholder="brightness_pct: 40"
      .value=${data && Object.keys(data).length ? dump(data, { lineWidth: 120, noRefs: true }) : ""}
      @change=${(e: Event) => {
        try {
          const parsed = load((e.target as HTMLTextAreaElement).value || "{}") ?? {};
          if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("it needs to be a mapping like brightness_pct: 40");
          ed.error = "";
          setButtonValue(ed, i, "data", Object.keys(parsed).length ? JSON.parse(JSON.stringify(parsed)) : undefined);
        } catch (err: any) {
          ed.error = `Data isn't valid: ${err.message}`;
        }
      }}
    ></textarea>
  </label>`;
}

/** Whether the entity's value is written under the name. Off leaves just the icon, which suits a toggle. */
function showValueField(ed: DockbarEditor, i: number) {
  const b = ed.working.buttons[i];
  return html`<label class="field">
    <span class="label">Show the value on the button</span>
    <input
      type="checkbox"
      class="switch"
      .checked=${b.show_value !== false}
      @change=${(e: Event) => {
        const on = (e.target as HTMLInputElement).checked;
        // Switching it back on writes an explicit true only when a lower level turned it off, so it can override that.
        setButtonValue(ed, i, "show_value", on ? (ed.lower.buttons.find((x) => x.id === b.id)?.show_value === false ? true : undefined) : false);
      }}
    />
  </label>`;
}

/** Ask before running, for buttons you could press by accident, like a garage door. */
function confirmField(ed: DockbarEditor, i: number) {
  const b = ed.working.buttons[i];
  return html`<label class="field">
    <span class="label">Ask before running</span>
    <input
      type="checkbox"
      class="switch"
      .checked=${Boolean(b.confirm)}
      @change=${(e: Event) => {
        const on = (e.target as HTMLInputElement).checked;
        // Switching it off writes an explicit false only when a lower level turned it on, so it can override that.
        setButtonValue(ed, i, "confirm", on ? true : ed.lower.buttons.find((x) => x.id === b.id)?.confirm ? false : undefined);
      }}
    />
  </label>`;
}

export function moveButton(ed: DockbarEditor, i: number, delta: number) {
  const list = moveWithin(ed.working.buttons, i, delta);
  if (!list) return;
  ed.working.buttons = list;
  ed.changed();
}

// Pointer events rather than HTML drag and drop, so dragging also works on touch screens.
export function dragStart(ed: DockbarEditor, e: PointerEvent, id: string) {
  if (e.button !== 0) return;
  e.preventDefault();
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
  ed.dragId = id;
}

export function dragMove(ed: DockbarEditor, e: PointerEvent) {
  if (!ed.dragId) return;
  const from = ed.working.buttons.findIndex((b) => b.id === ed.dragId);
  const rows = [...ed.renderRoot.querySelectorAll<HTMLElement>("ul.buttons > li")];
  // The new index is how many of the other rows the pointer is below the middle of.
  let to = 0;
  rows.forEach((li, k) => {
    const r = li.getBoundingClientRect();
    if (k !== from && e.clientY > r.top + r.height / 2) to++;
  });
  if (from < 0 || to === from) return;
  const list = [...ed.working.buttons];
  list.splice(to, 0, ...list.splice(from, 1));
  // Dragging a section takes its buttons along; a button dragged out of its section snaps back into it.
  ed.working.buttons = groupOrder(list);
  ed.changed();
}

export function dragEnd(ed: DockbarEditor) {
  ed.dragId = null;
}

/** Unhiding writes an explicit false only when a lower level hid the button, so it can override that. */
export function toggleHidden(ed: DockbarEditor, i: number) {
  const b = { ...ed.working.buttons[i] };
  if (b.hidden) {
    if (ed.lower.buttons.find((x) => x.id === b.id)?.hidden) b.hidden = false;
    else delete b.hidden;
  } else b.hidden = true;
  ed.working.buttons = ed.working.buttons.map((x, n) => (n === i ? b : x));
  ed.changed();
}

export function removeButton(ed: DockbarEditor, i: number) {
  const gone = ed.working.buttons[i];
  // A deleted section's buttons move back to the top level rather than vanishing.
  ed.working.buttons = ed.working.buttons
    .filter((_, n) => n !== i)
    .map((b) => (b.parent === gone.id ? withParent(ed, b, "") : b));
  ed.changed();
}

/** Clearing a parent writes "" only when a lower level set one, so it can override that. */
export function withParent(ed: DockbarEditor, b: DockbarButton, parent: string): DockbarButton {
  const out = { ...b };
  if (parent) out.parent = parent;
  else if (ed.lower.buttons.find((x) => x.id === b.id)?.parent) out.parent = "";
  else delete out.parent;
  return out;
}

export function setParent(ed: DockbarEditor, i: number, parent: string) {
  const b = ed.working.buttons[i];
  ed.working.buttons = groupOrder(ed.working.buttons.map((x, n) => (n === i ? withParent(ed, b, parent) : x)));
  ed.changed();
}

export function sectionField(ed: DockbarEditor, b: DockbarButton, i: number) {
  const list = ed.working.buttons;
  if (isSection(list, b)) {
    return html`<div class="field">
      <span class="label">Inside section</span>
      <span class="hint">This is a section (${childrenOf(list, b.id).length} buttons inside), so it stays on the top level.</span>
    </div>`;
  }
  const current = parentOf(list, b) ?? "";
  const options = list.filter((x) => x.id !== b.id && !parentOf(list, x));
  return html`<label class="field">
    <span class="label">Inside section</span>
    <select @change=${(e: Event) => setParent(ed, i, (e.target as HTMLSelectElement).value)}>
      <option value="" ?selected=${!current}>None (top level)</option>
      ${options.map((x) => html`<option value=${x.id} ?selected=${x.id === current}>${x.name || x.id}</option>`)}
    </select>
    <span class="hint">Pick any top-level button to turn it into a section.</span>
  </label>`;
}

export function addButton(ed: DockbarEditor, b?: DockbarButton) {
  const taken = new Set([...ed.working.buttons, ...ed.lower.buttons].map((x) => x.id));
  const button = b ?? { id: uniqueId("button", taken), name: "New button", icon: "mdi:star", action: "navigate" as const, path: "/" };
  ed.working.buttons = [...ed.working.buttons, button];
  ed.expanded = b ? ed.expanded : button.id;
  ed.changed();
}

export function addHaButton(ed: DockbarEditor, button: Omit<DockbarButton, "id">) {
  const taken = new Set([...ed.working.buttons, ...ed.lower.buttons].map((x) => x.id));
  addButton(ed, { ...clone(button), id: uniqueId(button.name ?? "button", taken) } as DockbarButton);
}

export function setButton(ed: DockbarEditor, i: number, key: keyof DockbarButton, value: string) {
  const b = { ...ed.working.buttons[i] } as Record<string, unknown>;
  if (value === "") delete b[key];
  else b[key] = value;
  ed.working.buttons = ed.working.buttons.map((x, n) => (n === i ? (b as unknown as DockbarButton) : x));
  ed.changed();
}

export function buttonText(ed: DockbarEditor, i: number, label: string, key: keyof DockbarButton, opts: { placeholder?: string } = {}) {
  return html`<label class="field">
    <span class="label">${label}</span>
    <input
      type="text"
      placeholder=${opts.placeholder ?? ""}
      .value=${(ed.working.buttons[i][key] as string) ?? ""}
      @change=${(e: Event) => setButton(ed, i, key, (e.target as HTMLInputElement).value.trim())}
    />
  </label>`;
}

/** A text field that searches a list as you type, but accepts anything you type too. */
export function buttonPicker(
  ed: DockbarEditor,
  i: number,
  label: string,
  key: keyof DockbarButton,
  options: () => PickerOption[],
  placeholder: string,
) {
  return html`<div class="field">
    <span class="label">${label}</span>
    <dockbar-picker
      label=${label}
      placeholder=${placeholder}
      .value=${(ed.working.buttons[i][key] as string) ?? ""}
      .options=${options}
      @pick=${(e: CustomEvent<string>) => setButton(ed, i, key, e.detail.trim())}
    ></dockbar-picker>
  </div>`;
}

export function buttonColour(ed: DockbarEditor, i: number, label: string, key: keyof ButtonStyle | "alert_icon_color" | "on_icon_color") {
  const value = ed.working.buttons[i][key] ?? "";
  return html`<div class="field">
    <span class="label">${label}</span>
    <span class="colour">
      <input type="color" .value=${asHex(value)} @input=${(e: Event) => setButton(ed, i, key, (e.target as HTMLInputElement).value)} />
      <input
        type="text"
        .value=${value}
        placeholder="inherit"
        @change=${(e: Event) => setButton(ed, i, key, (e.target as HTMLInputElement).value.trim())}
      />
    </span>
  </div>`;
}

export function iconField(ed: DockbarEditor, i: number) {
  const value = ed.working.buttons[i].icon ?? "";
  if (customElements.get("ha-icon-picker")) {
    return html`<label class="field">
      <span class="label">Icon</span>
      <ha-icon-picker
        .hass=${hass()}
        .value=${value}
        @value-changed=${(e: CustomEvent) => setButton(ed, i, "icon", e.detail.value ?? "")}
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
        @change=${(e: Event) => setButton(ed, i, "icon", (e.target as HTMLInputElement).value.trim())}
      />
    </span>
  </label>`;
}

export function renderButtonForm(ed: DockbarEditor, b: DockbarButton, i: number) {
  return html`
    <div class="button-form">
      <div class="grid">
        ${buttonText(ed, i, "Name", "name")} ${iconField(ed, i)}
        <label class="field">
          <span class="label">Does</span>
          <select @change=${(e: Event) => setButton(ed, i, "action", (e.target as HTMLSelectElement).value)}>
            ${ACTIONS.map((a) => html`<option value=${a} ?selected=${a === b.action}>${ACTION_LABELS[a]}</option>`)}
          </select>
        </label>
        ${b.action === "navigate"
          ? buttonPicker(ed, i, "Page", "path", () => ed.targets.map((t) => ({ value: t.path, label: t.label })), "Search dashboards, or type /lovelace/0")
          : nothing}
        ${b.action === "url" ? buttonText(ed, i, "Link", "url", { placeholder: "https://…" }) : nothing}
        ${b.action === "perform_action"
          ? html`${buttonPicker(ed, i, "Action", "service", serviceOptions, "Search actions, e.g. light turn on")}
            ${targetField(ed, i)} ${dataField(ed, i)}`
          : nothing}
        ${["perform_action", "toggle", "more_info"].includes(b.action) ? confirmField(ed, i) : nothing}
        ${sectionField(ed, b, i)}
      </div>
      ${actionProblem(b) ? html`<span class="hint warn">${actionProblem(b)}</span>` : nothing}
      <h4>Count badge <span class="hint">a number in the corner when something needs attention</span></h4>
      <div class="grid">
        <label class="field">
          <span class="label">Shows</span>
          <select @change=${(e: Event) => setButton(ed, i, "badge", (e.target as HTMLSelectElement).value)}>
            <option value="" ?selected=${!b.badge}>Automatic (${BADGE_LABELS[badgeSource({ ...b, badge: undefined })]})</option>
            ${BADGE_SOURCES.map((s) => html`<option value=${s} ?selected=${s === b.badge}>${BADGE_LABELS[s]}</option>`)}
          </select>
        </label>
        ${badgeSource(b) !== "none" || isSection(ed.working.buttons, b)
          ? html`${buttonColour(ed, i, "Badge colour", "badge_color")}
            ${buttonColour(ed, i, "Icon colour with a badge", "alert_icon_color")}`
          : nothing}
      </div>
      ${isSection(ed.working.buttons, b)
        ? html`<span class="hint">
            As a section, while closed it also shows the total of its buttons' badges, using these colours.
          </span>`
        : nothing}
      <h4>Live value <span class="hint">shows an entity's state on the button, and is the entity that Toggle and Open details use</span></h4>
      <div class="grid">
        ${buttonPicker(ed, i, "Entity", "entity", entityOptions, "Search entities, e.g. sensor.pv_power")}
        ${buttonPicker(ed, i, "Attribute", "attribute", () => attributeOptions(b.entity), "blank = state")}
        ${b.entity
          ? html`<div class="field">
              <span class="label">Shows</span>
              <span class="preview-value">${entityText(b.entity, b.attribute) ?? "entity not found"}</span>
            </div>`
          : nothing}
        ${b.entity ? showValueField(ed, i) : nothing}
        ${b.entity && b.show_value !== false ? buttonColour(ed, i, "Value colour", "state_color") : nothing}
        ${b.entity ? buttonColour(ed, i, "Icon colour when on", "on_icon_color") : nothing}
      </div>
      <h4>Style for this button <span class="hint">blank = use "Every button"</span></h4>
      <div class="grid">
        ${buttonColour(ed, i, "Icon colour", "icon_color")} ${buttonColour(ed, i, "Name colour", "name_color")}
        ${buttonColour(ed, i, "Background", "background")} ${buttonText(ed, i, "Border", "border", { placeholder: "inherit" })}
      </div>
    </div>
  `;
}

/** Adds buttons from a pasted YAML list, giving any clashing ids a new one. */
export function importButtons(ed: DockbarEditor) {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = load(ed.importText);
  } catch (err: any) {
    ed.importMsg = `Not valid YAML: ${err.message}`;
    return;
  }
  const list = Array.isArray(raw) ? raw : (raw as { buttons?: unknown })?.buttons;
  const parsed = sanitiseLayer({ buttons: list ?? [] }, (m) => warnings.push(m)).buttons ?? [];
  const taken = new Set([...ed.working.buttons, ...ed.lower.buttons].map((b) => b.id));
  const added = parsed.map((b) => ({ ...b, id: taken.has(b.id) ? uniqueId(b.name ?? b.id, taken) : (taken.add(b.id), b.id) }));
  if (added.length) {
    ed.working.buttons = [...ed.working.buttons, ...added];
    ed.changed();
    ed.importText = "";
  }
  ed.importMsg = [`Added ${added.length} button${added.length === 1 ? "" : "s"}.`, ...warnings].join(" ");
}

export function renderButtons(ed: DockbarEditor) {
  const lowerIds = new Map(ed.lower.buttons.map((b) => [b.id, b]));
  const removed = ed.lower.buttons.filter((b) => !ed.working.buttons.some((w) => w.id === b.id));
  const n = ed.working.buttons.length;
  return html`
    <ul class=${ed.dragId ? "buttons sorting" : "buttons"}>
      ${ed.working.buttons.map((b, i) => {
        const base = lowerIds.get(b.id);
        const tag = ed.scope === "shared" ? "" : !base ? "added" : !same(base, b) ? "changed" : "";
        const open = ed.expanded === b.id;
        // Only the level a button was added at can delete it; levels above can hide it.
        const deletable = ed.scope === "shared" || !base;
        const inside = Boolean(parentOf(ed.working.buttons, b));
        const kids = inside ? 0 : childrenOf(ed.working.buttons, b.id).length;
        return html`<li
          class=${[open ? "open" : "", ed.dragId === b.id ? "dragging" : "", b.hidden ? "is-hidden" : "", inside ? "child-row" : ""].join(" ")}
        >
          <div class="row">
            <span
              class="handle"
              title="Drag to reorder"
              aria-hidden="true"
              aria-hidden="true"
              @pointerdown=${(e: PointerEvent) => dragStart(ed, e, b.id)}
              @pointermove=${(e: PointerEvent) => dragMove(ed, e)}
              @pointerup=${() => dragEnd(ed)}
              @pointercancel=${() => dragEnd(ed)}
            >⠿</span>
            <ha-icon .icon=${b.icon ?? ""} style="color:${b.icon_color ?? "inherit"}"></ha-icon>
            <button class="title" aria-expanded=${open} @click=${() => (ed.expanded = open ? null : b.id)}>
              <strong>${b.name || "(no name)"}</strong>
              <span>${b.action === "navigate" ? b.path : b.action === "url" ? b.url : ACTION_LABELS[b.action]}</span>
            </button>
            ${kids ? html`<span class="tag section-tag" title="A section with ${kids} buttons inside">section · ${kids}</span>` : nothing}
            ${b.hidden ? html`<span class="tag">hidden</span>` : nothing} ${tag ? html`<span class="tag">${tag}</span>` : nothing}
            <button class="icon" title="Move up" aria-label="Move ${b.name || b.id} up" ?disabled=${i === 0} @click=${() => moveButton(ed, i, -1)}>▲</button>
            <button class="icon" title="Move down" aria-label="Move ${b.name || b.id} down" ?disabled=${i === n - 1} @click=${() => moveButton(ed, i, 1)}>▼</button>
            <button class="icon" title=${b.hidden ? "Show on the bar" : "Hide from the bar"} aria-label=${`${b.hidden ? "Show" : "Hide"} ${b.name || b.id}`} @click=${() => toggleHidden(ed, i)}>
              <ha-icon .icon=${b.hidden ? "mdi:eye-off" : "mdi:eye"}></ha-icon>
            </button>
            ${deletable
              ? html`<button class="icon danger" title="Delete" aria-label="Delete ${b.name || b.id}" @click=${() => removeButton(ed, i)}>
                  <ha-icon icon="mdi:delete"></ha-icon>
                </button>`
              : html`<span class="icon spacer"></span>`}
          </div>
          ${open ? renderButtonForm(ed, b, i) : nothing}
        </li>`;
      })}
    </ul>
    <div class="add-row">
      <button class="add" @click=${() => addButton(ed)}>+ Add button</button>
      <span class="hint">Home Assistant:</span>
      ${HA_BUTTONS.map(
        (h) => html`<button class="chip" title="Add a ${h.label} button" @click=${() => addHaButton(ed, h.button)}>
          + ${h.label}
        </button>`,
      )}
    </div>
    <details class="import">
      <summary>Import buttons from YAML</summary>
      <textarea
        rows="6"
        spellcheck="false"
        placeholder="- name: HACS&#10;  icon: mdi:store&#10;  path: /hacs&#10;  icon_color: '#41BDF5'"
        .value=${ed.importText}
        @input=${(e: Event) => (ed.importText = (e.target as HTMLTextAreaElement).value)}
      ></textarea>
      <div class="import-row">
        <span class="hint">${ed.importMsg}</span>
        <button class="text" ?disabled=${!ed.importText.trim()} @click=${() => importButtons(ed)}>Import</button>
      </div>
    </details>
    ${removed.length
      ? html`<section>
          <h3>Removed here</h3>
          <div class="chips">
            ${removed.map(
              (b) => html`<button class="chip" title="Show again" @click=${() => addButton(ed, clone(b))}>
                <ha-icon .icon=${b.icon ?? ""}></ha-icon> ${b.name} ↺
              </button>`,
            )}
          </div>
        </section>`
      : nothing}
  `;
}
