# README screenshots

These scripts make the images in the main README that show Dockbar's own interface: the settings dialogs, the phone screens, the light-page image and the six-looks image at the top. They render the real built Dockbar in headless Chrome, against a stand-in for Home Assistant with demo data, so the images can be regenerated whenever the interface changes.

They are **renders, not screenshots of a live Home Assistant**. The page behind the bar and the entities are made up, and the dialog uses an imitation of Home Assistant's dark theme.

## What you need

- Node 24 (the same as the main project) and `npm install` in this folder.
- Google Chrome. Set `CHROME_PATH` if it isn't at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- Python 3 with Pillow and NumPy (`pip install pillow numpy`). Set `PYTHON` if it isn't `python`.
- The fonts the framing uses (Segoe UI on Windows). Pillow falls back to a default font where they're missing, so the text will look different.

## Run it

```bash
npm run build            # in the repo root: the bundle the page loads
cd scripts/screenshots
npm install
npm run render           # makes ./out, ./framed, ./phones and ./built
npm run docs             # the same, then copies the results into ../../docs
```

`npm run docs` replaces these files in `docs/`: `settings-general.png`, `settings-list.png`, `settings-toggle.png`, `settings-actions.png`, `phones.png`, `phones-fonts.png`, `hero.png` and `hero-page.png`.

## What's here

| File | Does |
|---|---|
| `page.html` | The stand-in Home Assistant page: a `hass` object with demo entities, services and dashboards, and a demo Dockbar layer. `?light` gives the light page used for `hero-page.png`, `?phone=<look>&pos=top\|bottom&theme=dark\|light` gives the phone screens, and `?hero=<look>` gives one tall side bar for `hero.png`. |
| `phone.js` | The phone variants: the looks, the bar position and the stand-in dashboard behind the bar. It also holds the look definitions the hero image reuses. |
| `hero.js` | The tall side bar for `hero.png`: seven buttons, the current page in amber, blue 3D keys, a serif font on Glass, and coloured shapes behind Glass so its frosting shows. |
| `server.mjs` | A tiny server for the page, the built bundle and the Material Design icons. |
| `shoot.mjs` | Opens the settings dialog and captures its tabs. |
| `shoot-bar.mjs` | Captures the Soft bar on the light page. |
| `shoot-phones.mjs` | Captures six phone screens (Neon, Glass, Soft, Soft Dark, 3D, Dock) at a top or bottom position, with Chrome's safe-area emulation. |
| `shoot-hero.mjs` | Captures the six bars (Soft, Soft Dark, Neon, Glass, Dock, 3D) for `hero.png`. |
| `compose.py`, `compose-phones.py`, `compose-page.py`, `compose-hero.py` | Frame the captures: gradient, shadow, phone bezel, the title and the captions. |
| `render.mjs` | Runs all of the above. |
| `hacs-check.mjs` | Runs a README through the same HTML filter Home Assistant uses to show it in HACS, and reports what would be dropped or shown as text. `npm run hacs-check`. |
