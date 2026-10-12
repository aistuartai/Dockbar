// One-click looks for the bar. Applying one sets the bar and every-button styles;
// the buttons themselves, and any colours set on a single button, are left alone.
import { DEFAULT_SETTINGS, type DockbarConfig, type Settings } from "./config.ts";

export interface Preset {
  label: string;
  description: string;
  settings: Partial<Settings>;
}

export const PRESETS: Record<string, Preset> = {
  glass: {
    label: "Glass",
    description: "See-through with blur and soft edges",
    settings: {
      background: "rgba(255, 255, 255, 0.06)",
      background_opacity: null,
      backdrop_filter: "blur(16px) saturate(140%)",
      show_names: true,
      active_indicator: "fill",
      hover_effect: "lift",
      defaults: {
        background: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        border_radius: "14px",
        shadow: "soft",
      },
      active: { background: "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.4)" },
    },
  },
  flat: {
    label: "Flat",
    description: "Solid colours, no borders",
    settings: {
      background: "var(--card-background-color, #1c1c1c)",
      background_opacity: null,
      backdrop_filter: "none",
      show_names: true,
      active_indicator: "fill",
      hover_effect: "brighten",
      defaults: { background: "transparent", border: "none", border_radius: "10px", shadow: "none" },
      active: {
        background: "var(--primary-color)",
        border: "none",
        icon_color: "var(--text-primary-color, #fff)",
        name_color: "var(--text-primary-color, #fff)",
      },
    },
  },
  neon: {
    label: "Neon",
    description: "Dark with a coloured glow",
    settings: {
      background: "rgba(10, 6, 24, 0.85)",
      background_opacity: null,
      backdrop_filter: "blur(10px)",
      show_names: true,
      active_indicator: "glow",
      indicator_color: "#9C88FF",
      hover_effect: "glow",
      defaults: {
        background: "rgba(30, 20, 60, 0.6)",
        border: "1px solid rgba(156, 136, 255, 0.35)",
        border_radius: "12px",
        name_color: "#C9BEFF",
        shadow: "none",
      },
      active: { border: "1px solid #9C88FF", background: "rgba(60, 40, 120, 0.7)" },
    },
  },
  material: {
    label: "Material",
    description: "A pill behind the current icon",
    settings: {
      background: "var(--sidebar-background-color, var(--card-background-color, #1c1c1c))",
      background_opacity: null,
      backdrop_filter: "none",
      show_names: true,
      active_indicator: "pill",
      hover_effect: "brighten",
      defaults: { background: "transparent", border: "none", border_radius: "16px", shadow: "none" },
      active: {},
    },
  },
  soft: {
    label: "Soft",
    description: "Calm light grey soft UI, with the current page pressed into the surface",
    settings: {
      background: "#E6E9EE",
      background_opacity: null,
      backdrop_filter: "none",
      show_names: true,
      active_indicator: "fill",
      hover_effect: "none",
      indicator_color: "#4F6B62",
      defaults: {
        background: "#E6E9EE",
        border: "none",
        border_radius: "20px",
        icon_color: "#4F6B62",
        name_color: "#4F6B62",
        state_color: "#4F6B62",
        badge_color: "#4F6B62",
        font_size: "10px",
        text_transform: "uppercase",
        letter_spacing: "0.14em",
        shadow: "soft-ui",
      },
      active: { icon_color: "#3B5148", name_color: "#3B5148" },
    },
  },
  "3d": {
    label: "3D",
    description: "Raised keys that press in, with the current page pushed down",
    settings: {
      background: "rgba(20, 14, 40, 0.9)",
      background_opacity: null,
      backdrop_filter: "blur(8px)",
      show_names: true,
      active_indicator: "fill",
      hover_effect: "lift",
      defaults: {
        background: "#3B2A86",
        border: "none",
        border_radius: "12px",
        name_color: "#FFFFFF",
        shadow: "3d",
      },
      active: { background: "#5B45C8" },
    },
  },
  dock: {
    label: "Dock",
    description: "Icons only, growing on hover",
    settings: {
      background: "rgba(255, 255, 255, 0.08)",
      background_opacity: null,
      backdrop_filter: "blur(20px) saturate(160%)",
      show_names: false,
      active_indicator: "dot",
      hover_effect: "grow",
      defaults: { background: "transparent", border: "none", border_radius: "14px", shadow: "none" },
      active: {},
    },
  },
};

/** The config with a preset's look applied on top. Button lists are untouched. */
export function applyPreset(config: DockbarConfig, preset: Preset): DockbarConfig {
  const { defaults, active, ...rest } = preset.settings;
  return {
    ...config,
    ...rest,
    // Every-button and current-page styles are replaced rather than mixed, so the preset looks as intended.
    defaults: { ...DEFAULT_SETTINGS.defaults, ...defaults },
    active: { ...active },
  };
}
