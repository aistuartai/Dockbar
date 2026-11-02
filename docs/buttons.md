# Buttons

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

[Using Dockbar](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md) · **Buttons** · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · [All settings](https://github.com/aistuartai/Dockbar/blob/main/docs/settings-reference.md) · [Troubleshooting](https://github.com/aistuartai/Dockbar/blob/main/docs/troubleshooting.md) · [How it works](https://github.com/aistuartai/Dockbar/blob/main/docs/how-it-works.md)

Every button action, the pinned buttons at the end of the bar, and how to write buttons in YAML.

---

## Button actions

| Action | Needs | Does |
|---|---|---|
| `navigate` (default) | `path` | Opens a dashboard or view. The editor suggests every dashboard and view you can open. |
| `url` | `url` | Opens a link in a new tab. Only `http:`, `https:`, `mailto:` and `tel:` links are accepted. |
| `notifications` | | Opens HA's notifications drawer |
| `section` | | Only opens and closes the buttons inside it |
| `toggle_sidebar` | | Opens HA's sidebar when it's hidden, or collapses and expands it when it's docked |
| `toggle_header` | | Shows or hides the dashboard header |
| `perform_action` | `service` | Runs a Home Assistant action, such as `scene.turn_on`, as the signed-in user. Optional `target` (one entity or a list), `data` (a mapping sent with it) and `confirm`. |
| `toggle` | `entity` | Toggles the entity: lights, switches and fans toggle, locks lock or unlock, covers open or close, scenes and scripts run, buttons are pressed. Optional `confirm`. |
| `more_info` | `entity` | Opens the entity's details dialog, the same as tapping it on a dashboard. Optional `confirm`. |
| `settings` | | Opens Dockbar settings |
| `disable` | | Turns Dockbar off on this device |

## Pinned buttons

These sit at the end of the bar. Turn each one on or off in **General → Pinned buttons**.

| Button | Does |
|---|---|
| Dockbar settings (sliders) | Opens the settings dialog |
| ☰ Menu | Opens Home Assistant's sidebar when it's hidden, or collapses and expands it when it's docked |
| ▭ Header | Shows or hides the dashboard header for this session |
| ⏻ Turn off | Turns Dockbar off **on this device**. HA's sidebar and header come back, and a small round button in the corner turns it back on. |

## Buttons in YAML

**Action buttons.** A tap can run something in Home Assistant, using whatever the signed-in user is allowed to do. A button with a `service` and no `action` is an action button. Set `confirm: true` on anything you could press by accident and the bar asks first. If an action fails, Home Assistant shows the reason at the bottom of the screen.

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

**Live values.** Give a button `entity: sensor.pv_power` to show its state under the name, formatted the way HA shows it (units, translations). Add `attribute: <name>` to show an attribute instead. `state_color` colours the value. `on_icon_color` changes the icon's colour while the entity is on, open, unlocked, playing or otherwise active. Set `show_value: false` to leave the written value off and keep just the icon.

```yaml
- name: Solar
  icon: mdi:solar-power-variant
  path: /energy/solar
  entity: sensor.pv_power
  state_color: "#FFD54F"
```

**Sections.** Open a button in the Buttons tab and pick **Inside section** to put it inside another top-level button. That button becomes a section: tapping it opens its page (if it has one) and shows its buttons underneath, and only one section is open at a time. Give a section the action **Only open its buttons** if it has no page of its own. In YAML, add `parent: <section id>` to a button.

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

**Count badges.** The Buttons tab has one-click **+ Settings**, **+ Notifications**, **+ Updates**, **+ Repairs** and **+ Profile** buttons. A button that opens `/config`, `/config/updates` or `/config/repairs`, or HA's notifications, gets the matching badge automatically. Set `badge` to `notifications`, `updates`, `repairs`, `config` (updates + repairs, like HA's Settings) or `none` to choose it yourself. `badge_color` sets its colour (default: your theme's accent). To change the icon too while there's a badge, use the `alert` style for every button, or `alert_icon_color` on one button. Repairs are only counted for admins, the same as in HA.

```yaml
- name: Settings
  icon: mdi:cog
  path: /config
- name: Notifications
  icon: mdi:bell
  action: notifications
```

**Hiding and deleting.** Drag ⠿ to reorder, 👁 to hide a button from the bar (it stays in the list to show again later), and 🗑 to delete it. Deleting is only offered at the level the button was added; levels above hide it instead, so a user can hide a shared button for themselves without removing it for everyone. A button can also be hidden in YAML with `hidden: true`. When an admin adds a button for everyone, it still appears for users who've reordered or hidden their own buttons.

**Button keys:** `id`, `name`, `icon`, `action`, `path` (or `navigation_path`, as in HA's own cards), `url`, `entity`, `attribute`, `badge`, `alert_icon_color`, `on_icon_color`, `show_value`, `parent`, `hidden`, `service`, `target`, `data`, `confirm`, plus any style key.

**Button style keys** (in `defaults`, `active`, `alert`, or on a button): `background`, `border`, `border_radius`, `icon_color`, `name_color`, `icon_size`, `font_size`, `font_family` (a CSS font stack such as `Georgia, serif`; the editor offers System, Rounded, Condensed, Serif, Monospace, Humanist and Handwriting), `font_weight` (e.g. `500`, `bold`; applies to names, live values stay semi-bold), `state_color`, `badge_color`, `shadow` (`none`, `soft`, `raised`, `glow`, `3d`, `soft-ui`, or any CSS box-shadow), `text_transform` (e.g. `uppercase`), `letter_spacing` (e.g. `0.14em`).
