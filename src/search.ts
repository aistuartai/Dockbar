// Search-as-you-type for the editor's pickers. Free of DOM so it can be tested.

export interface PickerOption {
  value: string;
  /** A friendlier name shown beside the value, and searched too. */
  label?: string;
}

export interface SearchResult {
  shown: PickerOption[];
  /** How many options matched, which can be more than are shown. */
  total: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The options that contain every word of the query, best matches first.
 * Words match anywhere in the value or label, so "kitchen light" finds light.kitchen_ceiling.
 */
export function searchOptions(options: PickerOption[], query: string, limit = 60): SearchResult {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { shown: options.slice(0, limit), total: options.length };
  // A word at the start of a word (after . _ / - or a space) beats one buried inside it.
  const starts = words.map((w) => new RegExp(`(^|[ ._/-])${escape(w)}`));
  const scored: { option: PickerOption; score: number }[] = [];
  for (const option of options) {
    const value = option.value.toLowerCase();
    const label = (option.label ?? "").toLowerCase();
    const haystack = `${value} ${value.replace(/[._/-]+/g, " ")} ${label}`;
    let score = 0;
    let all = true;
    for (let i = 0; i < words.length; i++) {
      const at = haystack.indexOf(words[i]);
      if (at < 0) {
        all = false;
        break;
      }
      score += value === words[i] ? -100 : value.startsWith(words[i]) ? 0 : label.startsWith(words[i]) ? 1 : starts[i].test(haystack) ? 5 : 20 + at / 1000;
    }
    if (all) scored.push({ option, score });
  }
  scored.sort((a, b) => a.score - b.score || a.option.value.localeCompare(b.option.value));
  return { shown: scored.slice(0, limit).map((s) => s.option), total: scored.length };
}
