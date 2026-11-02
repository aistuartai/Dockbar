# How it works

[← Back to the Dockbar README](https://github.com/aistuartai/Dockbar#readme)

[Using Dockbar](https://github.com/aistuartai/Dockbar/blob/main/docs/using.md) · [Buttons](https://github.com/aistuartai/Dockbar/blob/main/docs/buttons.md) · [Looks, YAML and CSS](https://github.com/aistuartai/Dockbar/blob/main/docs/looks-and-yaml.md) · [All settings](https://github.com/aistuartai/Dockbar/blob/main/docs/settings-reference.md) · [Troubleshooting](https://github.com/aistuartai/Dockbar/blob/main/docs/troubleshooting.md) · **How it works**

What Dockbar does inside Home Assistant, how it compares with similar projects, and how to build it.

---

## How it works

- **An integration plus a frontend module.** The integration serves a small JavaScript module and registers it with Home Assistant's frontend, so every page loads it once. It also provides `switch.dockbar` for turning the bar on and off.
- **Settings live in Home Assistant.** The Everyone level is stored in Home Assistant's system data and Just me in each user's data, both under the key `dockbar`, and they sync live to every open screen. This device is stored in the browser's localStorage. Because the settings aren't part of the integration's files, they survive an uninstall and reinstall.
- **Each level stores only what it changes,** and the levels are merged on the fly: defaults, then Everyone, then Just me, then This device.
- **It reaches into Home Assistant's frontend** to hide the sidebar and header, reserve room for the bar through the safe-area insets Home Assistant already honours, and read panels, entities and notifications. All of that lives in one file (`src/ha.ts`). A few seconds after load, Dockbar checks those hooks and logs a clear warning in the browser console if an update has moved one.
- **Actions run as the signed-in user** through Home Assistant's own service calls, so permissions are enforced by Home Assistant, not by Dockbar.
- **Security.** Button links are limited to `http:`, `https:`, `mailto:` and `tel:`, and saved settings are validated when read. See the [security policy](https://github.com/aistuartai/Dockbar/blob/main/SECURITY.md) to report a problem.

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

Releases are built by GitHub Actions when a `v*` tag is pushed. Bug reports and ideas are welcome as [issues](https://github.com/aistuartai/Dockbar/issues/new/choose).
