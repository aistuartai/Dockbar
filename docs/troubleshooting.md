# Troubleshooting

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

[Using Dockbar](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md) · [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md) · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · [All settings](https://github.com/aistuartai/Dockbar/blob/main/docs/settings-reference.md) · **Troubleshooting** · [How it works](https://github.com/aistuartai/Dockbar/blob/main/docs/how-it-works.md)

Fixes for the usual problems, and the URL switches that get you out of trouble.

---

**The bar isn't showing.** Add `?dockbar=on` to any Home Assistant address and reload. This clears the "off" settings a browser can keep from an earlier install or the Turn off button.

**I hid the Settings button and can't get back in.** Add `?dockbar=edit` to any address. On a kiosk with no address bar, hold a finger on the bar for two seconds, or add a [dashboard button](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md#a-dashboard-button-for-the-settings) that opens the settings.

**I want to start again.** Open the settings, choose the level, and click **Reset buttons**, **Reset look** or **Reset everything**. Each one tells you what it resets before it does anything, and nothing changes until you click Save. Reinstalling Dockbar keeps your settings, because they're stored in Home Assistant, so a reset is also how you start clean after a reinstall.

**I want to turn it off for a moment.** Add `?dockbar=off` to an address. It lasts for that browser session. Turning the Dockbar integration off and on again also brings the bar back on a page that was disabled this way.

**The header or sidebar has disappeared.** That's the **Hide HA sidebar** and **Hide dashboard header** settings under **General → Home Assistant**. The header comes back when you edit a dashboard.

## Escape hatches

- `?dockbar=off` in any URL disables Dockbar for that browser session. `?dockbar=on` brings it back, and also undoes the Turn off button on this device. Turning the Dockbar integration off and on again in **Settings → Devices & services** also brings it back on a page that was disabled this way.
- `?dockbar=edit` opens the settings dialog, even if the Settings button is hidden. It works when the page loads and when you navigate to it from inside Home Assistant, so a dashboard button can open the settings.
- On a kiosk with no address bar, hold a finger on the bar for two seconds to open the settings if the Settings button is hidden.
