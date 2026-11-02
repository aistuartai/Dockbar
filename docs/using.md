# Using Dockbar

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

**Using Dockbar** · [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md) · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · [All settings](https://github.com/aistuartai/Dockbar/blob/main/docs/settings-reference.md) · [Troubleshooting](https://github.com/aistuartai/Dockbar/blob/main/docs/troubleshooting.md) · [How it works](https://github.com/aistuartai/Dockbar/blob/main/docs/how-it-works.md)

Open the settings, choose who a change applies to, and set up the common things.

---

## Open the settings

Click the **Dockbar settings** button (the sliders icon) at the end of the bar, or add `?dockbar=edit` to any address. Changes preview live on the bar, and nothing is saved until you click **Save**.

| Tab | For |
|---|---|
| **General** | The look, the layout, what Home Assistant shows, where to hide the bar, the pinned buttons and colours |
| **Buttons** | Your buttons: adding, ordering, hiding and deleting them, what each one does, sections, badges and live values |
| **Advanced** | Every setting as YAML, and custom CSS |

## Everyone, just me, or this device

The dialog has three levels. Each one only stores what it changes, and they stack in this order, so you can set a base look for everyone and then adjust it for yourself or for one tablet.

| Level | Who can edit | Applies to |
|---|---|---|
| **Everyone** | Admins | All users |
| **Just me** | Each person | That person, on every device |
| **This device** | Anyone | This browser only, for example a wall tablet |

A ● next to a setting means it's changed at the level you're editing. Click it to put it back. The footer has three reset buttons, each with a warning that says what it resets: **Reset buttons** (the button list only), **Reset look** (colours, presets and styles; your buttons and saved looks stay) and **Reset everything** (all changes at the level you're on, including saved looks made there). You see the result before you save.

## Recipes

**Add a button that toggles a light**

1. **Buttons → + Add button**, and give it a name and icon.
2. Under **Does**, choose **Toggle an entity**.
3. Under **Live value**, search for the light in **Entity**.
4. Pick a colour for **Icon colour when on**, and switch off **Show the value on the button** if you only want the icon.

**Run a scene**

1. **Buttons → + Add button**, then under **Does** choose **Run a Home Assistant action**.
2. In **Action**, search for `scene.turn_on`, and add the scene in **Target entity**.

**Make a garage button safe to tap**

Set up a **Toggle an entity** button for the garage door and tick **Ask before running**. The bar asks first, every time.

**Put the bar at the bottom on phones**

**General → Layout → On phones**, choose **Bottom** (or **Top**, or **Hidden**), and set **Phone bar thickness** if you want it thinner.

**Hide the bar on a wall-panel dashboard**

**General → Hide the bar on**, and search for the dashboard. To hide it on one tablet only, do this under **This device** on that tablet.

**Hide Home Assistant's own sidebar**

**General → Home Assistant → Hide HA sidebar.** The Menu button at the end of the bar still opens it.

## Turning it on and off

| How | Effect |
|---|---|
| **`switch.dockbar`** | Shows or hides the bar on every screen instantly. Works in automations, scripts and dashboards. |
| **Settings → Devices & services → Dockbar → ⋮ → Disable** | Stops loading Dockbar. Open screens drop the bar immediately, and Home Assistant's sidebar and header come back. Enabling it brings the bar back the same way. |
| **⏻ Turn off** pinned button | This device only. A round button in the bottom-right corner turns it back on. |

## A dashboard button for the settings

Add a button card (or any card with a tap action) that navigates to `?dockbar=edit`:

```yaml
type: button
name: Dockbar settings
icon: mdi:tune-variant
tap_action:
  action: navigate
  navigation_path: "?dockbar=edit"
```

It stays on the same dashboard page and opens the settings dialog on top.
