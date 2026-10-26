import { LitElement, css, html, nothing } from "lit";
import { searchOptions, type PickerOption, type SearchResult } from "../search.ts";

let counter = 0;
const TRACKED = ["scroll", "resize", "wheel", "touchmove"];

/**
 * A text box that suggests matches as you type, for entities, actions and pages.
 * Fires `pick` with the chosen value, or with the typed text if it matches nothing.
 * With `clear-on-pick` it clears itself after each pick, for adding several values one by one.
 */
export class DockbarPicker extends LitElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static properties = {
    value: { type: String },
    placeholder: { type: String },
    label: { type: String },
    clearOnPick: { type: Boolean, attribute: "clear-on-pick" },
    open: { state: true },
    query: { state: true },
    typed: { state: true },
    active: { state: true },
    listStyle: { state: true },
  };

  declare value: string;
  declare placeholder: string;
  declare label: string;
  declare clearOnPick: boolean;
  declare open: boolean;
  declare query: string;
  declare typed: boolean;
  declare active: number;
  declare listStyle: string;
  /** Called each time the list opens, so a long list is only built when it's wanted. */
  options: () => PickerOption[] = () => [];

  private uid = `dockbar-picker-${++counter}`;
  private all: PickerOption[] = [];
  private result: SearchResult = { shown: [], total: 0 };
  private frame = 0;
  /** Moves the list with the input. Scroll events don't cross out of the dialog's shadow root, so wheel and touch stand in for them. */
  private reposition = () => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.place());
  };

  constructor() {
    super();
    this.value = "";
    this.placeholder = "";
    this.label = "";
    this.clearOnPick = false;
    this.open = false;
    this.query = "";
    this.typed = false;
    this.active = 0;
    this.listStyle = "";
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTracking();
  }

  private get input() {
    return this.renderRoot.querySelector("input") as HTMLInputElement;
  }

  private show() {
    if (this.open) return;
    this.all = this.options();
    this.open = true;
    this.search();
    this.place();
    for (const type of TRACKED) window.addEventListener(type, this.reposition, { capture: true, passive: true });
  }

  private hide() {
    this.open = false;
    this.typed = false;
    this.query = "";
    this.stopTracking();
  }

  private stopTracking() {
    cancelAnimationFrame(this.frame);
    for (const type of TRACKED) window.removeEventListener(type, this.reposition, { capture: true });
  }

  private search() {
    this.result = searchOptions(this.all, this.typed ? this.query : "");
    this.active = 0;
  }

  /** Fixed to the screen so the dialog's scrolling and clipping can't cut the list off; flips up near the bottom. */
  private place() {
    const input = this.renderRoot.querySelector("input");
    if (!input) return;
    const r = input.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const width = `left:${r.left}px;width:${r.width}px;`;
    this.listStyle =
      below < 220 && r.top > below
        ? `${width}bottom:${window.innerHeight - r.top + 2}px;max-height:${Math.min(260, r.top - 8)}px`
        : `${width}top:${r.bottom + 2}px;max-height:${Math.min(260, below - 8)}px`;
  }

  private choose(value: string) {
    this.dispatchEvent(new CustomEvent<string>("pick", { detail: value }));
    this.hide();
    if (this.clearOnPick) this.input.value = "";
  }

  private onInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
    this.typed = true;
    this.show();
    this.search();
  }

  private onKey(e: KeyboardEvent) {
    const last = this.result.shown.length - 1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!this.open) return this.show();
      this.active = e.key === "ArrowDown" ? Math.min(last, this.active + 1) : Math.max(0, this.active - 1);
      this.updateComplete.then(() => this.renderRoot.querySelector("li.on")?.scrollIntoView({ block: "nearest" }));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = this.open && this.result.shown[this.active];
      if (pick) this.choose(pick.value);
      else if (this.typed && this.query.trim()) this.choose(this.query.trim());
    } else if (e.key === "Escape" && this.open) {
      // Close the list, not the whole dialog.
      e.stopPropagation();
      this.hide();
      this.input.value = this.clearOnPick ? "" : this.value;
    }
  }

  private onBlur() {
    const text = this.query.trim();
    const commit = this.typed && !this.clearOnPick && text !== this.value;
    this.hide();
    if (commit) this.dispatchEvent(new CustomEvent<string>("pick", { detail: text }));
    else if (!this.clearOnPick) this.input.value = this.value;
  }

  render() {
    const { shown, total } = this.result;
    return html`
      <input
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-label=${this.label}
        aria-autocomplete="list"
        aria-expanded=${this.open}
        aria-controls=${`${this.uid}-list`}
        aria-activedescendant=${this.open && shown.length ? `${this.uid}-${this.active}` : nothing}
        placeholder=${this.placeholder}
        .value=${this.typed ? this.query : this.clearOnPick ? "" : this.value}
        @focus=${(e: FocusEvent) => {
          this.show();
          if (!this.clearOnPick) (e.target as HTMLInputElement).select();
        }}
        @input=${(e: Event) => this.onInput(e)}
        @keydown=${(e: KeyboardEvent) => this.onKey(e)}
        @blur=${() => this.onBlur()}
      />
      ${this.open
        ? html`<ul id=${`${this.uid}-list`} role="listbox" style=${this.listStyle} @mousedown=${(e: Event) => e.preventDefault()}>
            ${shown.map(
              (o, i) => html`<li
                id=${`${this.uid}-${i}`}
                role="option"
                class=${i === this.active ? "on" : ""}
                aria-selected=${i === this.active}
                @click=${() => this.choose(o.value)}
                @mousemove=${() => (this.active = i)}
              >
                ${o.label && o.label !== o.value
                  ? html`<span class="name">${o.label}</span><span class="val">${o.value}</span>`
                  : html`<span class="name">${o.value}</span>`}
              </li>`,
            )}
            ${shown.length === 0
              ? html`<li class="note">${this.typed && this.query.trim() ? "No match. Press Enter to use what you typed." : "Nothing to suggest."}</li>`
              : nothing}
            ${total > shown.length ? html`<li class="note">${total - shown.length} more. Keep typing to narrow it down.</li>` : nothing}
          </ul>`
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid var(--db-ed-line, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      background: var(--db-ed-input, #2a2a2a);
      color: inherit;
      font: inherit;
      font-size: 0.9rem;
    }
    input:focus {
      outline: 2px solid var(--db-ed-accent, #03a9f4);
      outline-offset: -1px;
    }
    ul {
      position: fixed;
      z-index: 10;
      box-sizing: border-box;
      margin: 0;
      padding: 4px;
      overflow: auto;
      list-style: none;
      background: var(--db-ed-bg, #1c1c1c);
      border: 1px solid var(--db-ed-line, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }
    li {
      display: flex;
      flex-direction: column;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
    }
    li.on {
      background: color-mix(in srgb, var(--db-ed-accent, #03a9f4) 28%, transparent);
    }
    .name {
      font-size: 0.9rem;
      overflow-wrap: anywhere;
    }
    .val {
      font-size: 0.75rem;
      opacity: 0.65;
      overflow-wrap: anywhere;
    }
    .note {
      cursor: default;
      font-size: 0.8rem;
      opacity: 0.65;
    }
  `;
}
