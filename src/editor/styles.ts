import { css } from "lit";

export const editorStyles = css`
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
  button:focus-visible,
  summary:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--db-ed-accent);
    outline-offset: 2px;
  }
  .dialog:focus {
    outline: none;
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
  .buttons li.child-row {
    margin-inline-start: 22px;
    border-inline-start: 3px solid color-mix(in srgb, var(--db-ed-accent) 45%, transparent);
  }
  .section-tag {
    background: color-mix(in srgb, var(--db-ed-accent) 35%, transparent);
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
  .chip.saved {
    padding: 0 6px 0 0;
    border-color: color-mix(in srgb, var(--db-ed-accent) 60%, transparent);
  }
  .chip-label {
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    padding: 6px 4px 6px 12px;
    cursor: pointer;
  }
  .add-look {
    border-style: dashed;
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
  .add-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .add-row .add {
    margin-right: 6px;
  }
  textarea.yaml {
    width: 100%;
    box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.4;
    tab-size: 2;
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
