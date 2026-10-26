<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aistuartai/Dockbar/main/custom_components/dockbar/brand/dark_logo.png">
  <img alt="Dockbar" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/custom_components/dockbar/brand/logo.png" height="96">
</picture>

# Dockbar

A persistent, fully styleable navigation bar for **every** Home Assistant dashboard, on the left, right, top or bottom of the screen.

[![Latest release](https://img.shields.io/github/v/release/aistuartai/Dockbar)](https://github.com/aistuartai/Dockbar/releases)
[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5)](#install)
[![License: MIT](https://img.shields.io/github/license/aistuartai/Dockbar)](https://github.com/aistuartai/Dockbar/blob/main/LICENSE)

<p align="center">
  <img alt="Dockbar in six looks: Soft, Soft Dark, Neon, Glass, Dock and 3D" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/hero.png" width="800">
</p>

Dockbar isn't a card. It loads once for the whole frontend, so it stays put when you switch dashboards and needs no per-view setup. It can also hide Home Assistant's own sidebar and dashboard header.

<p align="center">
  <img alt="The Soft look on a light Home Assistant dashboard" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/hero-page.png" width="800">
</p>

## Features

- **Works out of the box.** On first install the bar mirrors your HA sidebar, in your order.
- **Full GUI and YAML configuration.** Set everything in the settings dialog with a live preview, or edit it as YAML.
- **Styleable.** Presets, current-page markers, hover effects, shadows, glass blur, per-button colours and your own CSS.
- **New dashboards appear by themselves.** Turn on one setting and a button for each dashboard you create from then on is added to the end of the bar.
- **Sections.** Group buttons under a top-level button that opens in place, like folders.
- **Live values and badges.** Show an entity's state on a button, or HA-style count badges for updates, repairs and notifications.
- **Buttons that do things.** Toggle a light, open a garage door, run a scene or any Home Assistant action, or open an entity's details, with an optional "ask first". The icon can change colour while the entity is on.
- **Three levels.** Set it for **everyone**, **just me** or **this device**, so a wall tablet can have its own layout.
- **Mobile friendly.** Left, right, top or bottom, with its own edge and size on phones (or hidden there), and the bar scrolls when buttons don't fit.
- **Hide it where you don't want it.** Per dashboard (for a kiosk view), per device, or everywhere with `switch.dockbar`.

<p align="center">
  <img alt="Dockbar as a top bar on a phone" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/phone-home.png" width="260">
</p>

## Looks

<p align="center">
  <img alt="Dockbar cycling through its looks" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/presets.gif" width="480">
</p>

One click on a preset sets the bar and every button's style. Your buttons, and any colours set on a single button, stay as they are.

| Preset | Look |
|---|---|
| **Glass** | See-through with blur and soft edges, lifts on hover |
| **Flat** | Solid colours, no borders, current page filled with your theme colour |
| **Neon** | Dark with a coloured glow |
| **Material** | Clean, with a pill behind the current page's icon |
| **Soft** | Neumorphism: light grey, soft light and shade, current page pressed in |
| **Soft Dark** | Soft UI on dark grey with purple accents |
| **3D** | Raised keys that press in; the current page stays pressed |
| **Dock** | Icons only, growing on hover, a dot under the current page |

Then adjust anything: how the current page is marked (fill, line, pill, dot or glow), the hover effect, the button shadow, colours, corners and labels. Save your own as a named look. See [Looks](#looks-in-detail) for details.

> Tested on Home Assistant 2026.10.0, 2026.10.1 and 2026.10.4.

## Install

Dockbar is a small integration that loads the bar on every page. There's no YAML to edit.

### HACS (recommended)

Dockbar is in the HACS default store.

[![Open your Home Assistant instance and open Dockbar inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=aistuartai&repository=Dockbar&category=integration)

1. In HACS, search for **Dockbar**, download it and restart Home Assistant.
2. **Settings → Devices & services → Add integration → Dockbar.** The bar appears straight away, already filled with your sidebar: every dashboard and panel in your order, then Notifications, Settings and Profile.

> **Bar not showing?** Add `?dockbar=on` to any Home Assistant address (for example `http://homeassistant.local:8123/?dockbar=on`) and reload. It clears the "off" settings this browser may have kept from an earlier install or from the Turn off button. See [Escape hatches](#escape-hatches).

Already installed it as a custom repository? It keeps updating as before.

### Manual

Unzip `dockbar.zip` from the latest [release](https://github.com/aistuartai/Dockbar/releases) into `/config/custom_components/dockbar/`, restart, then add the integration as above.

## Turning it on and off

| How | Effect |
|---|---|
| **`switch.dockbar`** | Shows or hides the bar on every screen instantly. Works in automations, scripts and dashboards. |
| **Settings → Devices & services → Dockbar → ⋮ → Disable** | Stops loading Dockbar. Open screens drop the bar immediately, and HA's sidebar and header come back. Enabling it brings the bar back the same way. |
| **⏻ Turn off** pinned button | This device only. A round button in the bottom-right corner turns it back on. |

## Configure

Click the **Dockbar settings** button (the sliders icon) pinned at the end of the bar, or add `?dockbar=edit` to any URL. Changes preview live on the bar, and nothing is saved until you click **Save**.

The dialog has three tabs:

| Tab | For |
|---|---|
| **General** | The look (presets, current-page marker, hover, shadow), layout, phones, HA's sidebar and header, hiding on dashboards, pinned buttons, and colours |
| **Buttons** | Adding, ordering, hiding and deleting buttons, what each one does when tapped, sections, badges, live values, and importing buttons from YAML. Entity, action and page fields are searchable pickers. |
| **Advanced** | A YAML editor for everything the level you're editing changes, and custom CSS |

### Three levels

| Level | Who can edit | Stored in | Applies to |
|---|---|---|---|
| **Everyone** | Admins | HA system data | All users |
| **Just me** | Each user | HA user data | That user, on every device |
| **This device** | Anyone | Browser localStorage | This browser only, e.g. a wall tablet |

Each level stores only what it changes, and the levels stack in that order. A ● next to a setting means it's changed at the level you're editing; click it to reset.

The dialog's footer has a **Reset** button for the level you're on. At **Just me** and **This device** it removes that level's changes. At **Everyone** it is **Reset to defaults**: the bar goes back to what a fresh install shows (your HA sidebar, with new dashboards added automatically) and the Everyone settings and saved looks are removed. Either way you see the result first, and nothing changes until you click **Save**. Reinstalling Dockbar keeps your settings, since they live in Home Assistant, so this is also how to start clean.

On the **Buttons** tab, drag ⠿ to reorder, 👁 to hide a button from the bar (it stays in the list to show again later), and 🗑 to delete it. Deleting is only offered at the level the button was added; levels above hide it instead, so a user can hide a shared button for themselves without removing it for everyone. A button can also be hidden in YAML with `hidden: true`.

When an admin adds a button for everyone, it still appears for users who've reordered or hidden their own buttons. Changes saved in HA sync live to every open screen.

### Pinned buttons

These sit at the end of the bar. Turn each one on or off in **General → Pinned buttons**.

| Button | Does |
|---|---|
| Dockbar settings (sliders) | Opens the settings dialog |
| ☰ Menu | Opens Home Assistant's sidebar when it's hidden, or collapses and expands it when it's docked |
| ▭ Header | Shows or hides the dashboard header for this session |
| ⏻ Turn off | Turns Dockbar off **on this device**. HA's sidebar and header come back, and a small round button in the corner turns it back on. |

### Button actions

| Action | Needs | Does |
|---|---|---|
| `navigate` (default) | `path` | Opens a dashboard or view. The editor suggests every dashboard and view you can open. |
| `url` | `url` | Opens a link in a new tab |
| `notifications` | | Opens HA's notifications drawer |
| `section` | | Only opens and closes the buttons inside it |
| `toggle_sidebar` | | Opens HA's sidebar when it's hidden, or collapses and expands it when it's docked |
| `toggle_header` | | Shows or hides the dashboard header |
| `perform_action` | `service` | Runs a Home Assistant action, such as `scene.turn_on`, as the signed-in user. Optional `target` (one entity or a list), `data` (a mapping sent with it) and `confirm`. |
| `toggle` | `entity` | Toggles the entity: lights, switches and fans toggle, locks lock or unlock, covers open or close, scenes and scripts run, buttons are pressed. Optional `confirm`. |
| `more_info` | `entity` | Opens the entity's details dialog, the same as tapping it on a dashboard. Optional `confirm`. |
| `settings` | | Opens Dockbar settings |
| `disable` | | Turns Dockbar off on this device |

### Looks in detail

**General → Look** has the presets above to start from.

**+ Save current look** keeps your current look (bar colours and blur, current-page marker, hover, and the every-button, current-page and badge styles) under a name, as a chip next to the built-in presets. Saved looks belong to the level you're editing: under **Everyone** they're offered to all users, under **Just me** only to you. They appear in the Advanced YAML as `custom_presets`, so you can copy one to share it. A look shared from **Everyone** can't be deleted under **Just me**, but if you change it there, **↺** puts it back to the shared version.

Below the presets: how the current page is marked (fill, line, pill, dot or glow) and its colour, the hover effect, and the button shadow (none, soft, raised, glow, 3D or Soft UI). 3D and Soft UI work out their light and dark edges from each button's own colour, so they suit any colour scheme. Soft UI looks best when the bar and buttons share one mid-to-light or dark-grey colour; on near-black there's no darker shade left for its shadow. The Soft UI shadow is sized from the bar's **Padding**, so it fits in the room around the buttons: at the default padding of 8 it's a tight, subtle shade, and a padding of about 14 or more gives the full, deeper look. Shadows are never clipped at the edge of the buttons; the bar's edge is the limit.

### Advanced: YAML and CSS

The **Advanced** tab shows everything the level you're editing changes, as YAML. Edit anything, including values the other tabs don't offer (for example a shadow of your own like `0 0 20px #9C88FF`), then click **Apply** to preview and **Save** to keep it. Anything invalid is listed and skipped rather than breaking the bar.

Custom CSS goes in the same tab and is injected into the bar. You can target these parts: `bar`, `button`, `active`, `alert`, `badge`, `state`, `children`, `footer`.

### Starting from YAML (optional)

If `/config/www/dockbar/config.yaml` exists and nothing has been saved under **Everyone** yet, Dockbar uses the file as the shared config. The first time an admin saves under **Everyone**, the file's contents move into HA and the file is ignored from then on.

See [`examples/config.yaml`](https://github.com/aistuartai/Dockbar/blob/main/examples/config.yaml) for every option.

> ⚠️ Everything in `/config/www` is served at `/local/` **without authentication**. Don't put secrets in the YAML.

| Option | Default | Description |
|---|---|---|
| `position` | `left` | `left`, `right`, `top`, `bottom` |
| `mobile_position` | `bottom` | Position below `mobile_breakpoint`; `none` keeps `position`; `hidden` shows no bar on phones (HA's sidebar and header come back there) |
| `mobile_size` | same as `size` | Bar thickness in px on phones |
| `mobile_breakpoint` | `600` | Width in px |
| `hide_sidebar` | `false` | Uses HA's "always hidden" sidebar mode; your previous setting is restored when turned off |
| `hide_header` | `false` | Hides the dashboard header (it comes back in edit mode) |
| `size` | `88` | Bar thickness in px |
| `padding`, `gap` | `8` | Spacing in px |
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

**Button keys:** `id`, `name`, `icon`, `action`, `path` (or `navigation_path`, as in HA's own cards), `url`, `entity`, `attribute`, `badge`, `alert_icon_color`, `on_icon_color`, `show_value`, `parent`, `hidden`, `service`, `target`, `data`, `confirm`, plus any style key.

**Button style keys** (in `defaults`, `active`, `alert`, or on a button): `background`, `border`, `border_radius`, `icon_color`, `name_color`, `icon_size`, `font_size`, `state_color`, `badge_color`, `shadow` (`none`, `soft`, `raised`, `glow`, `3d`, `soft-ui`, or any CSS box-shadow), `text_transform` (e.g. `uppercase`), `letter_spacing` (e.g. `0.14em`).

**Sections:** open a button in the Buttons tab and pick **Inside section** to put it inside another top-level button. That button becomes a section: tapping it opens its page (if it has one) and shows its buttons underneath, and only one section is open at a time. Give a section the action **Only open its buttons** if it has no page of its own. In YAML, add `parent: <section id>` to a button.

```yaml
- id: energy
  name: Energy
  icon: mdi:lightning-bolt
  action: section
- name: Solar
  icon: mdi:solar-power-variant
  path: /solar/main
  parent: energy
- name: Costs
  icon: mdi:cash
  path: /home-dash/finance
  parent: energy
```

**Count badges:** the Buttons tab has one-click **+ Settings**, **+ Notifications**, **+ Updates**, **+ Repairs** and **+ Profile** buttons. A button that opens `/config`, `/config/updates` or `/config/repairs`, or HA's notifications, gets the matching badge automatically. Set `badge` to `notifications`, `updates`, `repairs`, `config` (updates + repairs, like HA's Settings) or `none` to choose it yourself. `badge_color` sets its colour (default: your theme's accent). To change the icon too while there's a badge, use the `alert` style for every button, or `alert_icon_color` on one button. Repairs are only counted for admins, the same as in HA.

```yaml
- name: Settings
  icon: mdi:cog
  path: /config
- name: Notifications
  icon: mdi:bell
  action: notifications
```

**Action buttons:** a tap can run something in Home Assistant, using whatever the signed-in user is allowed to do. A button with a `service` and no `action` is an action button. Set `confirm: true` on anything you could press by accident, like a garage door, and the bar asks first. If an action fails, Home Assistant shows the reason at the bottom of the screen.

```yaml
- name: Garage
  icon: mdi:garage
  action: toggle
  entity: cover.garage              # also shows its state on the button
  confirm: true
- name: Lounge
  icon: mdi:lightbulb
  action: toggle
  entity: light.lounge
  on_icon_color: '#FFD54F'          # the icon turns yellow while the light is on
  show_value: false                 # just the icon, without "On" written under the name
- name: Movie night
  icon: mdi:movie-open
  service: scene.turn_on            # no action needed when there's a service
  target: scene.movie_night
- name: Evening
  icon: mdi:weather-sunset
  service: light.turn_on
  target: [light.lounge, light.hall]
  data:
    brightness_pct: 40
```

Or set one up in the editor:

<p align="center">
  <img alt="A Toggle button's settings: ask before running, the entity it shows, and its icon colour when on" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/settings-toggle.png" width="760">
</p>

**Live values:** give a button `entity: sensor.pv_power` to show its state under the name, formatted the way HA shows it (units, translations). Add `attribute: <name>` to show an attribute instead. `state_color` colours the value. `on_icon_color` changes the icon's colour while the entity is on, open, unlocked, playing or otherwise active, so a toggle button can show at a glance whether the light is on. Set `show_value: false` to leave the written value off and keep just the icon.

```yaml
- name: Solar
  icon: mdi:solar-power-variant
  path: /energy/solar
  entity: sensor.pv_power
  state_color: "#FFD54F"
```

## Settings screens

Everything above is available in the settings dialog. Every setting also lives in the **Advanced** tab as YAML, so you can copy a whole setup between levels or instances.

**General** has the looks, layout, colours and what to hide:

<p align="center">
  <img alt="The General tab: eight presets, current-page marker, hover effect, shadow and layout" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/settings-general.png" width="760">
</p>

**Buttons** lists every button, with sections shown nested under their parent:

<p align="center">
  <img alt="The Buttons tab, with a House section holding Lights, Garden and Media" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/settings-list.png" width="760">
</p>

Pick what a button does, and search for entities and actions as you type:

<p align="center">
  <img alt="Searching for an action while setting up a Run a Home Assistant action button" src="https://raw.githubusercontent.com/aistuartai/Dockbar/main/docs/settings-actions.png" width="760">
</p>

## Escape hatches

- `?dockbar=off` in any URL disables Dockbar for that browser session. `?dockbar=on` brings it back, and also undoes the Turn off button on this device. Turning the Dockbar integration off and on again in **Settings → Devices & services** also brings it back on a page that was disabled this way.
- `?dockbar=edit` opens the settings dialog, even if the Settings button is hidden.

## Similar projects

Other projects tackle parts of the same problem. They're worth a look, and may suit you better:

- [**custom-sidebar**](https://github.com/elchininet/custom-sidebar) customises Home Assistant's own sidebar from a YAML file: reorder, hide, rename and add items, section headers and dividers, restyle it, use JavaScript or Jinja templates and click actions, and apply different setups by user, admin or device. If you like how HA's sidebar behaves and want to extend it, start there.
- [**kiosk-mode**](https://github.com/NemesisRE/kiosk-mode) hides the header and/or sidebar on Home Assistant dashboards. It does that one job and doesn't add navigation of its own.
- [**navbar-card**](https://github.com/joseluis9595/lovelace-navbar-card) is a Lovelace card you add from the dashboard editor. It shows a bottom navigation bar on mobile and a side bar on desktop, with a visual editor, configurable routes, styling, haptic feedback and an optional media player widget. It's the closest in spirit to Dockbar.

Dockbar takes a different approach: it's an integration, not a card or a sidebar tweak. It loads once for the whole frontend and draws a separate navigation bar on any edge, with its own phone layout, so nothing is added to individual dashboards. It can hide HA's sidebar and header too. Everything is set up in a settings dialog, with a YAML editor there when you want it. Buttons run Home Assistant actions on a tap, but there's no templating and no long-press or other click types yet; if you need those, custom-sidebar is the better fit.

## Development

```bash
npm install
npm test             # unit tests (Node 24, native TypeScript)
npm run build        # custom_components/dockbar/frontend/dockbar.js
npm run brand        # re-render the icon and logo PNGs from brand/icon.svg
npm run deploy       # build, then copy custom_components/dockbar into the HA config folder in .deploy-target or $DOCKBAR_DEPLOY_DIR
```

Releases are built by GitHub Actions when a `v*` tag is pushed.

## License

MIT
