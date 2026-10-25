# Changelog

## Unreleased

**New dashboards**
- **Add new dashboards automatically.** A switch under General → Home Assistant (Everyone level) adds a button at the end of the bar for each dashboard you create from then on. A dashboard you remove stays removed, because saving records the dashboards that already exist (`seen_panels`).
- It is on for a fresh install and off for an existing one, so updating changes nothing on a bar you've already set up.

**Accessibility**
- The settings dialog is now a proper modal: focus moves into it, Tab stays inside it, and focus goes back to the Settings button when it closes. Its tabs have the right roles.
- Icon-only buttons in the editor (move, hide, delete, remove) have names a screen reader can read, and buttons show a focus ring when tabbed to.
- Bar buttons are announced with their live value and badge count, for example "Solar, 1.2 kW, 2 pending".
- Animations and transitions are switched off for people who ask their device for reduced motion.

**Robustness**
- If a page was disabled with `?dockbar=off`, turning the Dockbar integration off and on again now brings the bar back. The README's install steps also mention `?dockbar=on` for a bar that doesn't show after installing.
- Five seconds after load Dockbar checks the parts of Home Assistant it relies on, and says in the browser console which one is missing if an HA update has moved it.
- If the Dockbar switch disappears (the integration was disabled or removed) the bar steps aside even when Home Assistant doesn't announce it. A switch that is only "unavailable" while HA restarts does not hide the bar.
- Saved configs are now version 2. A 0.6.2 tab that is still open refuses to save over a version 2 config instead of dropping the new settings.

**Under the hood**
- The settings editor is split into a module per tab, with its styles, field helpers and labels in their own files.
- More tests: saving and loading layers, the Home Assistant lookups, new dashboards and the hook check. The tests are now type-checked too.

## 0.6.2

**Security**
- A button's link must start with `http:`, `https:`, `mailto:` or `tel:`. Links like `javascript:` are dropped with a warning, and checked again when the button is clicked.

**Fixes**
- Moving a button up or down in the editor keeps sections together: a section moves with its buttons, and a button stays inside its section.
- A button added by one level no longer clashes with a button of the same name added later at a lower level. The lower level's button wins.
- Clearing a field on a shared button (such as its entity or badge) at the Just me or This device level now sticks instead of coming back on reload.
- `hide_sidebar`, `hide_header` and `show_names` written as `"false"` in YAML are read as false, and values that aren't true or false give a warning.
- Dockbar no longer waits forever if Home Assistant doesn't answer at startup, and a failure while building the first-run bar no longer stops it loading.
- Saving to This device reports an error when the browser's storage is full or blocked.
- Saved configs carry a version, so an older Dockbar tab won't overwrite settings written by a newer one.
- The Dockbar switch no longer polls every 30 seconds.

**Checks and warnings**
- Typos now say so in the browser console instead of being ignored: an unknown setting (`postion`), a button `action`, `badge` or `entity` that isn't valid.
- Sizes, spacing and breakpoints have generous upper limits (for example a bar thickness over 600), so an extra zero gives a warning instead of a bar wider than the screen.
- If the built `dockbar.js` is missing, the integration fails to load with a clear message.
- If Dockbar can't watch for the integration being disabled, it says so in the console.

**Performance**
- Dragging a slider or colour picker in the editor updates the live preview once per frame, not on every input event.
- The bar stops polling while the tab is hidden and catches up when it's shown, finds the Dockbar switch once instead of scanning every entity each time, and skips recomputing live values and badges when no entity has changed.

**Releases**
- The release build stops if the tag, `package.json` and `manifest.json` disagree, checks that the zip contains the built JavaScript, and marks tags like `v0.7.0-beta` as pre-releases.

## 0.6.1

**Docs**
- Dockbar is now in the HACS default store. The README leads the install section with searching for Dockbar in HACS, plus a one-click button, instead of the custom repository steps.

## 0.6.0

**Looks**
- **Save current look:** keep your own looks as named presets beside the built-in ones. They follow the three levels (Everyone, Just me, This device), add up across levels, and appear in the Advanced YAML as `custom_presets`.
- A saved look shared from a lower level can't be deleted, but if you've changed it, **↺** puts it back.
- **Soft UI on dark colours:** the light and shade are now a fixed step in perceived lightness (OKLCH) from the button's colour, so dark buttons get a subtle rim and a deep shadow instead of a white halo. Browsers without relative colour support keep the previous look.
- New **Soft Dark** preset: soft UI on dark grey with purple accents.

**Fixes**
- A saved look written in YAML without `defaults` or `active` no longer resets your every-button and current-page styles.
- `size`, `mobile_size`, `button_length` and `button_min_length` of 0 are now rejected with a warning instead of drawing a bar or buttons with no size. `padding` and `gap` can still be 0.
- The integration's setup text names the Dockbar settings button (sliders) rather than ⚙.

**Docs**
- The ☰ Menu button and `toggle_sidebar` are described as they behave: they open HA's sidebar when it's hidden, or collapse and expand it when it's docked.
- `navigation_path` is documented as another name for `path`.
- `examples/config.yaml` now has `custom_presets`, `badge`, `attribute`, `hidden`, `state_color` and `badge_color`, and a test checks that it loads without warnings.

**Under the hood**
- Every call into HA's frontend storage and page-change events now goes through `ha.ts`, so an HA upgrade only needs checking in one file.

## 0.5.1

**Looks**
- New **Soft** preset (neumorphism): light grey, shaped by soft light and shade, sage accents, uppercase spaced labels, and the current page pressed into the surface.
- New **Soft UI** button shadow, which works on any colour (including dark), with presses and the current page sinking in.
- New label style keys: `text_transform` (e.g. `uppercase`) and `letter_spacing`.

**Fixes**
- Divider lines (above the pinned buttons, and beside an open section) follow the button text colour, so they show on light bars.

**Docs**
- README: a tab overview, a Looks section with every preset, an Advanced (YAML and CSS) section, the full list of button keys, and the HACS submission.
- `examples/config.yaml` covers every current option (looks, sections, badges, live values). It also fixes an unquoted `border: 1px solid #9C88FF`, which YAML read as a comment, dropping the colour.

## 0.5.0

**Sections**
- Group buttons under a top-level button that opens in place to show them, like folders. One section is open at a time, and the section for the current page opens by itself.
- A closed section highlights when you're on one of its pages and adds up its buttons' badges.
- Set it with **Inside section** on any button, or `parent:` in YAML. A section can have its own page, or only open its buttons (`action: section`).

**Badges**
- Count badges like HA's sidebar: Settings shows pending updates and repairs, Notifications shows unread notifications, plus Updates and Repairs on their own.
- One-click **+ Settings**, **+ Notifications**, **+ Updates**, **+ Repairs** and **+ Profile** buttons.
- New `notifications` action opens HA's notifications drawer.
- Badge colour, a "Button with a badge" style, and a per-button icon colour while there's a badge.

**Looks**
- Presets: Glass, Flat, Neon, Material, 3D and Dock.
- Current page marker: fill, line, pill, dot or glow, with its own colour.
- Hover effects (brighten, lift, grow, glow) and button shadows (soft, raised, glow, 3D, or your own CSS).
- 3D buttons that press in, with the current page's button pushed down.
- New **Advanced** tab with a YAML editor for every setting, and custom CSS.

**Works out of the box**
- On first install the bar mirrors your HA sidebar, in your order, followed by Notifications, Settings and Profile.
- Buttons for pages a user can't open (Settings, HACS and so on for non-admins) are left off their bar.

**Fixes**
- A see-through bar on the left now shows a view's background image behind it instead of HA's base colour.
- Section buttons grow to fit their text instead of cutting it off.
- The pinned Dockbar settings button has its own icon, so it isn't confused with HA's Settings.

## 0.4.1
- On phones: a **Hidden** option, and a separate bar thickness.
- A fuller README.

## 0.4.0
- First public release: a Home Assistant integration with UI settings on three levels (everyone, per user, per device), drag to reorder, hide or delete buttons, live entity values, hiding on chosen dashboards, background opacity, `switch.dockbar`, and its own icon.
