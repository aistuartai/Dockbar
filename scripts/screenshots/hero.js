// Hero image: one tall side bar in a given look, over a dark page. `?hero=<look>`, plus optional `&c1`/`&c2` (the 3D key colours), `&font`
// and `&active=amber` (the current page's button in amber).
import { PRESETS } from "/phone.js";

export function setup(layer, params) {
  const look = params.get("hero");
  Object.assign(layer, structuredClone(PRESETS[look]));
  if (look === "3d" && params.get("c1")) {
    layer.defaults.background = params.get("c1");
    layer.active = { background: params.get("c2") };
  }
  if (params.get("font")) layer.defaults = { ...layer.defaults, font_family: params.get("font") };
  const names = { home: "Home", weather: "Weather", energy: "Solar", control: "Control", computers: "Computers", media: "Media", security: "Security" };
  const paths = { home: "/dashboard-main/0", weather: "/dashboard-weather/0", energy: "/dashboard-energy/0", control: "/dashboard-lights/0", computers: "/dashboard-garden/0", media: "/dashboard-media/0", security: "/dashboard-security/0" };
  const icons = { home: "mdi:home", weather: "mdi:weather-cloudy", energy: "mdi:solar-power-variant", control: "mdi:tune-vertical", computers: "mdi:desktop-classic", media: "mdi:play-box-multiple", security: "mdi:alert" };
  Object.assign(layer, { position: "left", size: 132, padding: 8, gap: 10, button_length: 62, button_min_length: 50, footer: [], auto_add_dashboards: false });
  layer.buttons = Object.keys(names).map((id) => ({ id, name: names[id], icon: icons[id], action: "navigate", path: paths[id] }));
  if (layer.defaults.text_transform) layer.defaults = { ...layer.defaults, font_size: "10px", letter_spacing: "0.1em" };
  const accent = params.get("active") === "amber" ? "#F0A12B" : look === "soft" ? "#4F6B62" : look === "3d" && params.get("c2") ? params.get("c2") : "#9C88FF";
  document.documentElement.style.setProperty("--primary-color", accent);

  if (params.get("active") === "amber") {
    const warm = {
      soft: { icon_color: "#B8650A", name_color: "#B8650A", border: "1px solid #F0A12B" },
      "soft-dark": { icon_color: "#FFC46B", name_color: "#FFFFFF", border: "1px solid #F0A12B" },
      neon: { icon_color: "#FFD08A", name_color: "#FFD08A", border: "1px solid #F0A12B", background: "rgba(90, 55, 10, 0.7)" },
      glass: { background: "rgba(240, 150, 40, 0.5)", border: "1px solid #F0A12B" },
      dock: { border: "1px solid #F0A12B" },
      "3d": { background: "#E58A1F" },
    };
    layer.active = { ...layer.active, ...warm[look] };
    layer.indicator_color = "#F0A12B";
  }

  // The frosted look needs something to frost: a few colourful shapes behind the bar, which its blur softens.
  const dots = [[96, 60, 46, "#38BDF8"], [34, 190, 54, "#E0457B"], [100, 330, 50, "#14B8A6"], [32, 460, 52, "#8B7CF6"], [96, 560, 44, "#F472B6"]];
  const scene = dots.map(([x, y, r, c]) => `radial-gradient(circle at ${x}px ${y}px, ${c} 0 ${r}px, transparent ${r + 1}px)`).join(", ");
  const style = document.createElement("style");
  style.textContent = `html, body { background: ${look === "glass" ? `${scene}, ` : ""}#0b1020 !important; margin: 0; overflow: hidden; }`;
  document.head.appendChild(style);
}
