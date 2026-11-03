# All settings

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

[Using Dockbar](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md) · [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md) · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · **All settings** · [Troubleshooting](https://github.com/aistuartai/Dockbar/blob/main/docs/troubleshooting.md) · [How it works](https://github.com/aistuartai/Dockbar/blob/main/docs/how-it-works.md)

Every option you can set in YAML or on the Advanced tab. See [`examples/config.yaml`](https://github.com/aistuartai/Dockbar/blob/main/examples/config.yaml) for a full example.

- **Every option is optional.** Leave one out and Dockbar uses the default shown here.
- **Sizes without a unit** (`size`, `padding`, `gap`, `edge_offset`...) are pixels. Style values such as `icon_size` are CSS, so they carry a unit (`28px`).
- **Levels.** Each setting can be set under Everyone, Just me or This device. A level only needs the settings it changes, and the most specific level wins. See [where settings live](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md#where-settings-live-and-editing-them).
- **Quote colours** that contain a `#`, for example `'#9C88FF'`. Unquoted, YAML reads everything after the `#` as a comment.
- **Buttons** have their own keys (`name`, `icon`, `path`, `action`, `entity`...), listed in [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md#buttons-in-yaml).

---

## Layout and placement

| Option | Default | Description |
|---|---|---|
| `position` | `left` | The screen edge the bar sits on: `left`, `right`, `top` or `bottom` |
| `mobile_position` | `bottom` | Where the bar goes on phones, meaning screens narrower than `mobile_breakpoint`. Same four values as `position`; `none` keeps `position`; `hidden` shows no bar on phones (HA's own sidebar and header come back there) |
| `mobile_size` | same as `size` | Bar thickness on phones, px |
| `mobile_breakpoint` | `600` | The screen width, in px, below which the phone settings (`mobile_position`, `mobile_size`) apply. Portrait phones are about 360 to 430 wide, so 600 catches them. A phone turned sideways is often wider than 600; raise this to about 900 to keep the phone layout in landscape |
| `hide_sidebar` | `false` | Hides Home Assistant's own sidebar, using its "always hidden" mode. Your previous sidebar setting is restored when you turn this off. The `menu` footer button still opens it |
| `hide_header` | `false` | Hides the dashboard header (it comes back in edit mode) |
| `reserve_space` | `false` | Top and bottom bars only. The Home Assistant page ends at the bar and no longer scrolls underneath it. Without it, the page is only padded clear of the bar at the very end of the scroll. Experimental |
| `edge_offset` | `0` | Px between the bar and the screen edge it sits on; the page leaves room for it too. Raise it when a phone's navigation bar covers the bar |
| `hide_on` | none | Dashboards where the bar is hidden, as URL paths: `/wall-panel` hides it on all that dashboard's views, `/wall-panel/kiosk` on one view. HA's sidebar and header settings still apply there |

## Size and spacing

| Option | Default | Description |
|---|---|---|
| `size` | `88` | Bar thickness, px: the width of a left or right bar, the height of a top or bottom bar |
| `padding` | `8` | Space between the bar's edge and its buttons, px |
| `gap` | `8` | Space between buttons, px |
| `button_length` | square | Button size along the bar, px. By default buttons are square: `size` minus the padding on both sides |
| `button_min_length` | `52` | Buttons shrink to fit the screen down to this length, px. Below it the bar scrolls |
| `show_names` | `true` | Show the name under each icon |

## Look

| Option | Default | Description |
|---|---|---|
| `background` | theme | The bar's background: any CSS colour, gradient or variable. Defaults to Home Assistant's sidebar colour |
| `background_opacity` | as written | 0 to 100. Fades the background colour, on top of any alpha it already has. The editor shows it as a slider |
| `backdrop_filter` | `blur(8px)` | A CSS filter applied to what shows through behind the bar, such as `blur(8px)`. Use `none` for no blur |
| `active_indicator` | `fill` | How the current page's button is marked: `fill` (only the `active` style), `line` (a line along one side of the button), `pill` (a pill behind the icon), `dot` (a dot under the icon) or `glow` (a glow around the button) |
| `indicator_color` | primary colour | Colour of the line, pill, dot or glow |
| `hover_effect` | `brighten` | What a button does under the pointer: `brighten`, `lift` (rises and gets a shadow), `grow`, `glow` or `none` |
| `defaults` | theme | The style for every button. Holds any [button style key](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md#buttons-in-yaml) (`background`, `border`, `border_radius`, `icon_color`, `name_color`, `icon_size`, `font_size`, `font_family`, `font_weight`, `state_color`, `badge_color`, `shadow`, `text_transform`, `letter_spacing`). A single button can override any of them |
| `active` | primary-colour border | Style applied on top of the current page's button. Same keys as `defaults` |
| `alert` | none | Style applied on top while a button shows a count badge, for example `icon_color: '#FF5252'`. Same keys as `defaults` |
| `custom_presets` | none | Your saved looks, by name, shown as chips under General → Look. Each holds any of the look settings in this section and `show_names`. A look that leaves out `defaults` or `active` keeps your current ones, so a look can change just the background |
| `style` | none | Raw CSS added inside the bar, for anything the settings can't do. The parts you can target are `bar`, `button`, `active`, `alert`, `badge`, `state`, `children` and `footer`, for example `.btn.active { box-shadow: 0 0 12px #9C88FF; }` |

## Pinned buttons and dashboards

| Option | Default | Description |
|---|---|---|
| `footer` | all four | The buttons pinned at the end of the bar. Any of `settings` (opens Dockbar's settings), `menu` (Home Assistant's sidebar), `header` (shows or hides the header) and `off` (turns the bar off on this device; `?dockbar=on` in the address brings it back). Use `[]` for none. With `settings` left out you can still open the settings by holding a finger on the bar for two seconds, or by adding `?dockbar=edit` to the address |
| `auto_add_dashboards` | `false` | Everyone level only; it has no effect at Just me or This device. Adds a button at the end of the bar for each dashboard created since `seen_panels` was recorded. On for a fresh install |
| `seen_panels` | none | The dashboards (URL paths) that existed when the Everyone config was last saved. The editor fills it in on save, so leave it alone; dashboards not listed count as new |
