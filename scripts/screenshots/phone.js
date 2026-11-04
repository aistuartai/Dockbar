// Phone screenshots: applies a look and a bar position to the demo layer, and draws a stand-in dashboard behind the bar.
export const PRESETS = {
  glass: {
    background: "rgba(255, 255, 255, 0.06)", backdrop_filter: "blur(16px) saturate(140%)", show_names: true, active_indicator: "fill", hover_effect: "lift",
    defaults: { background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.14)", border_radius: "14px", shadow: "soft" },
    active: { background: "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.4)" },
  },
  neon: {
    background: "rgba(10, 6, 24, 0.85)", backdrop_filter: "blur(10px)", show_names: true, active_indicator: "glow", indicator_color: "#9C88FF", hover_effect: "glow",
    defaults: { background: "rgba(30, 20, 60, 0.6)", border: "1px solid rgba(156, 136, 255, 0.35)", border_radius: "12px", name_color: "#C9BEFF", shadow: "none" },
    active: { border: "1px solid #9C88FF", background: "rgba(60, 40, 120, 0.7)" },
  },
  soft: {
    background: "#E6E9EE", backdrop_filter: "none", show_names: true, active_indicator: "fill", hover_effect: "none", indicator_color: "#4F6B62",
    defaults: { background: "#E6E9EE", border: "none", border_radius: "20px", icon_color: "#4F6B62", name_color: "#4F6B62", state_color: "#4F6B62", badge_color: "#4F6B62", font_size: "10px", text_transform: "uppercase", letter_spacing: "0.14em", shadow: "soft-ui" },
    active: { icon_color: "#3B5148", name_color: "#3B5148" },
  },
  "soft-dark": {
    background: "#2B2E35", backdrop_filter: "none", show_names: true, active_indicator: "fill", hover_effect: "none", indicator_color: "#9C88FF",
    defaults: { background: "#2B2E35", border: "none", border_radius: "20px", icon_color: "#B4A6FF", name_color: "#C9CED6", state_color: "#C9CED6", badge_color: "#9C88FF", font_size: "10px", text_transform: "uppercase", letter_spacing: "0.14em", shadow: "soft-ui" },
    active: { icon_color: "#D6CCFF", name_color: "#FFFFFF" },
  },
  "3d": {
    background: "rgba(10, 22, 44, 0.9)", backdrop_filter: "blur(8px)", show_names: true, active_indicator: "fill", hover_effect: "lift",
    defaults: { background: "#1D5FA8", border: "none", border_radius: "12px", name_color: "#FFFFFF", shadow: "3d" },
    active: { background: "#3B8BE0" },
  },
  dock: {
    background: "rgba(255, 255, 255, 0.08)", backdrop_filter: "blur(20px) saturate(160%)", show_names: false, active_indicator: "dot", hover_effect: "grow",
    defaults: { background: "transparent", border: "none", border_radius: "14px", shadow: "none" },
    active: {},
  },
};

export function setup(layer, params) {
  const look = params.get("phone");
  const pos = params.get("pos") || "bottom";
  const theme = params.get("theme") || "dark";

  Object.assign(layer, PRESETS[look]);
  const footer = params.has("footer");   // the pinned buttons, which sit two by two on a short bar
  if (!footer) layer.footer = [];   // otherwise a phone example keeps its room for the buttons
  if (params.get("font")) layer.defaults = { ...layer.defaults, font_family: params.get("font") };
  if (params.has("reserve")) layer.reserve_space = true;
  if (params.get("names") === "off") layer.show_names = false;   // icons only
  if (layer.defaults && layer.defaults.text_transform) Object.assign(layer.defaults, { font_size: "9px", letter_spacing: "0.05em" });
  Object.assign(layer, { mobile_position: pos, mobile_breakpoint: 600, mobile_size: look === "dock" ? 64 : 72, padding: 10, gap: 8, button_min_length: 44, button_length: 62, auto_add_dashboards: false });
  const byId = Object.fromEntries(layer.buttons.map((b) => [b.id, b]));
  layer.buttons = (footer ? ["home", "weather", "lounge", "settings"] : ["home", "weather", "lounge", "garage", "settings"]).map((id) => byId[id]);
  if (layer.defaults && layer.defaults.text_transform) byId.settings.name = "More";   // the spaced capitals of the Soft looks need a shorter word

  const light = theme === "light";
  const style = document.createElement("style");
  style.textContent = `
    :root { --ink: ${light ? "#4F6B62" : "#ffffff"}; --ink2: ${light ? "rgba(79,107,98,.72)" : "rgba(255,255,255,.62)"}; }
    html, body { margin: 0; height: 100%; overflow: hidden; }
    body { background: ${light ? "#E6E9EE" : "radial-gradient(circle at 18% 8%, rgba(56,140,200,.55), transparent 46%), radial-gradient(circle at 92% 42%, rgba(30,190,170,.35), transparent 42%), radial-gradient(circle at 20% 92%, rgba(40,100,190,.30), transparent 40%), linear-gradient(170deg,#12243d,#0a1424)"}; color: var(--ink); font-family: Roboto, "Segoe UI", sans-serif; }
    #status { position: fixed; top: 0; left: 0; right: 0; height: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; box-sizing: border-box; font-size: 13px; font-weight: 500; color: var(--ink); z-index: 1; }
    #status .icons { display: flex; gap: 6px; align-items: center; }
    #home { position: fixed; bottom: 7px; left: 50%; width: 120px; height: 4px; margin-left: -60px; border-radius: 3px; background: ${light ? "rgba(79,107,98,.55)" : "rgba(255,255,255,.7)"}; z-index: 1; }
    main { box-sizing: border-box; height: 100%; padding: calc(max(env(safe-area-inset-top, 0px), var(--app-safe-area-inset-top, 0px)) + 18px) 16px calc(max(env(safe-area-inset-bottom, 0px), var(--app-safe-area-inset-bottom, 0px)) + 18px); overflow: hidden; }
    .hello { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink2); }
    h1 { margin: 2px 0 16px; font-size: 32px; font-weight: 500; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .tile, .wide { border-radius: 22px; padding: 14px 16px; box-sizing: border-box; ${light
      ? "background:#E6E9EE; box-shadow: 8px 8px 16px #c3c9d4, -8px -8px 16px #ffffff;"
      : "background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(6px);"} }
    .tile { height: 96px; display: flex; flex-direction: column; justify-content: space-between; }
    .tile small, .wide small { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink2); }
    .tile b { font-size: 24px; font-weight: 500; }
    .amber { color: #E0A800; }
    .wide { margin-top: 14px; height: 116px; display: flex; flex-direction: column; justify-content: space-between; }
    .wide b { font-size: 26px; font-weight: 500; }
    .wide svg { width: 100%; height: 44px; }
    .chips { display: flex; gap: 10px; margin-top: 14px; }
    .chip { padding: 9px 14px; border-radius: 999px; font-size: 13px; ${light
      ? "background:#E6E9EE; box-shadow: 4px 4px 9px #c3c9d4, -4px -4px 9px #ffffff;"
      : "background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);"} }
  `;
  document.head.appendChild(style);
  if (params.has("reserve")) style.textContent += " main { height: auto; min-height: 100%; overflow: visible; }";

  const stroke = light ? "#4F6B62" : "#7DD3FC";
  document.body.insertAdjacentHTML("afterbegin", `
    <div id="status"><span>9:41</span><span class="icons">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1.5 4a9 9 0 0 1 13 0M4 6.6a5.4 5.4 0 0 1 8 0"/><circle cx="8" cy="9.2" r=".9" fill="currentColor" stroke="none"/></svg>
      <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".6" y=".6" width="22" height="10.8" rx="3.2" stroke="currentColor" opacity=".6"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><rect x="24" y="4" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".6"/></svg>
    </span></div>
    <main>
      <div class="hello">Good evening, Sam</div>
      <h1>Home</h1>
      <div class="grid">
        <div class="tile"><small>Lounge</small><b class="amber">On</b></div>
        <div class="tile"><small>Garage</small><b>Closed</b></div>
        <div class="tile"><small>Solar</small><b>3.2 kW</b></div>
        <div class="tile"><small>Climate</small><b>19.5°C</b></div>
      </div>
      <div class="wide"><small>Energy today</small><svg viewBox="0 0 300 44" preserveAspectRatio="none" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M0 34 C 30 30, 45 8, 75 14 S 120 36, 150 24 S 205 2, 235 12 S 280 30, 300 18"/></svg><b>12.4 kWh</b></div>
      <div class="chips"><span class="chip">Movie night</span><span class="chip">Dinner</span><span class="chip">Good night</span></div>
      ${params.has("reserve") ? `
      <div class="grid" style="margin-top:14px">
        <div class="tile"><small>Bedroom</small><b>Off</b></div>
        <div class="tile"><small>Front door</small><b>Locked</b></div>
        <div class="tile"><small>Hot water</small><b>54°C</b></div>
        <div class="tile"><small>Battery</small><b class="amber">82%</b></div>
      </div>
      <div class="wide"><small>Energy this week</small><svg viewBox="0 0 300 44" preserveAspectRatio="none" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M0 14 C 40 40, 60 4, 100 20 S 160 38, 190 16 S 250 6, 300 30"/></svg><b>86.1 kWh</b></div>` : ""}
    </main>
    <div id="home"></div>`);
  // With the page ending at the bar, the page scrolls inside the Home Assistant element instead of under the bar.
  if (params.has("reserve")) document.querySelector("home-assistant").append(document.querySelector("main"));
}
