# Changelog

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
