# All settings

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

[Using Dockbar](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md) · [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md) · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · **All settings** · [Troubleshooting](https://github.com/aistuartai/Dockbar/blob/main/docs/troubleshooting.md) · [How it works](https://github.com/aistuartai/Dockbar/blob/main/docs/how-it-works.md)

Every option you can set in YAML or on the Advanced tab. See [`examples/config.yaml`](https://github.com/aistuartai/Dockbar/blob/main/examples/config.yaml) for a full example.

---

| Option | Default | Description |
|---|---|---|
| `position` | `left` | `left`, `right`, `top`, `bottom` |
| `mobile_position` | `bottom` | Position below `mobile_breakpoint`; `none` keeps `position`; `hidden` shows no bar on phones (HA's sidebar and header come back there) |
| `mobile_size` | same as `size` | Bar thickness in px on phones |
| `mobile_breakpoint` | `600` | Width in px |
| `hide_sidebar` | `false` | Uses HA's "always hidden" sidebar mode; your previous setting is restored when turned off |
| `hide_header` | `false` | Hides the dashboard header (it comes back in edit mode) |
| `reserve_space` | `false` | Top and bottom bars only: the Home Assistant page ends at the bar and no longer scrolls underneath it (otherwise it is only padded clear at the end of the scroll). Experimental |
| `size` | `88` | Bar thickness in px |
| `padding`, `gap` | `8` | Spacing in px |
| `edge_offset` | `0` | Px between the bar and the screen edge it sits on, and the room the page leaves for it. Use it when a phone's navigation bar covers the bar |
| `button_length` | square | Button length along the bar |
| `button_min_length` | `52` | Buttons shrink to fit down to this, then the bar scrolls |
| `background`, `backdrop_filter` | theme | Bar styling |
| `background_opacity` | as written | 0–100. Fades the background colour, on top of any alpha it already has. The editor shows it as a slider. |
| `show_names` | `true` | Show labels under icons |
| `hide_on` | none | Paths where the bar is hidden, e.g. `/wall-panel` (all its views) or `/wall-panel/kiosk`. HA's sidebar and header settings still apply there. |
| `auto_add_dashboards` | `false` | Read from the Everyone level only; set at Just me or This device it has no effect. Adds a button at the end of the bar for each dashboard created since `seen_panels` was recorded. On for a fresh install. |
| `seen_panels` | none | The dashboards (url paths) that existed when the Everyone config was last saved. The editor fills it in on save; dashboards not listed count as new. |
| `footer` | all four | Pinned buttons: any of `settings`, `menu`, `header`, `off` |
| `defaults` | theme | Style for every button |
| `active` | primary border | Style applied on top of the current page's button |
| `alert` | none | Style applied on top while a button shows a count badge, e.g. `icon_color: "#FF5252"` |
| `active_indicator` | `fill` | How the current page is marked: `fill`, `line`, `pill`, `dot`, `glow` |
| `indicator_color` | primary colour | Colour of the line, pill, dot or glow |
| `hover_effect` | `brighten` | `brighten`, `lift`, `grow`, `glow`, `none` |
| `custom_presets` | none | Saved looks by name. Each holds any of the look settings: `background`, `background_opacity`, `backdrop_filter`, `show_names`, `active_indicator`, `indicator_color`, `hover_effect`, `defaults`, `active`, `alert`. A look that leaves out `defaults` or `active` keeps your current ones. |
| `style` | | Raw CSS inside the bar's shadow root. Parts: `bar`, `button`, `active`, `alert`, `badge`, `state`, `children`, `footer` |
