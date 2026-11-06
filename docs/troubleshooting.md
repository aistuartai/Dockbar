# Troubleshooting

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

[Using Dockbar](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md) · [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md) · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · [All settings](https://github.com/aistuartai/Dockbar/blob/main/docs/settings-reference.md) · **Troubleshooting** · [How it works](https://github.com/aistuartai/Dockbar/blob/main/docs/how-it-works.md)

Fixes for the usual problems, and the URL switches that get you out of trouble.

---

**The bar vanished after a Home Assistant update.** Hard-refresh the browser (Ctrl+Shift+R), or clear the app's cache on a phone or tablet. After an update the browser can keep running the old Home Assistant page, which doesn't load Dockbar. If it's still gone, check Settings → Devices & services that Dockbar is listed, then try `?dockbar=on` below.

**The bar isn't showing.** Add `?dockbar=on` to any Home Assistant address and reload. This clears the "off" settings a browser can keep from an earlier install or the Turn off button.

**The Settings button is hidden and the settings won't open.** Add `?dockbar=edit` to any address. On a kiosk with no address bar, hold a finger on the bar for two seconds, or add a [dashboard button](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md#a-dashboard-button-for-the-settings) that opens the settings.

**Starting again.** Open the settings, choose the level, and click **Reset buttons**, **Reset look** or **Reset everything**. Each one says what it resets before it does anything, and nothing changes until you click Save. Settings are stored in Home Assistant, so reinstalling Dockbar keeps them. A reset is how to start clean after a reinstall.

**Turning it off for a moment.** Add `?dockbar=off` to an address. It lasts for that browser session.

**The header or sidebar has disappeared.** This is the **Hide HA sidebar** and **Hide dashboard header** settings under **General → Home Assistant**. The header comes back when a dashboard is being edited.

## The URL switches

Add these to the end of any Home Assistant address, for example `http://homeassistant.local:8123/?dockbar=on`.

| Switch | Effect |
|---|---|
| `?dockbar=off` | Disables Dockbar for this browser session |
| `?dockbar=on` | Brings it back, and also undoes the Turn off button on this device |
| `?dockbar=edit` | Opens the settings dialog, even if the Settings button is hidden. It works when the page loads and when navigating to it from inside Home Assistant, so a dashboard button can open the settings |

Turning the Dockbar integration off and on again in **Settings → Devices & services** also brings the bar back on a page that was disabled with `?dockbar=off`.

On a kiosk with no address bar, hold a finger on the bar for two seconds to open the settings.
