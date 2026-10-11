// Renders brand/icon.svg into the PNGs Home Assistant (2026.3+) and HACS show for the integration.
// They live in custom_components/dockbar/brand/ and are committed, so run this after changing the SVG.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const OUT = "custom_components/dockbar/brand";
const icon = readFileSync("brand/icon.svg", "utf8");

// The logo is the icon plus the name, landscape, in a dark-text and a light-text version.
const logo = (textColour) => {
  const inner = icon.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 830 256">
  <g>${inner}</g>
  <text x="292" y="168" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="128"
        font-weight="700" letter-spacing="-2" fill="${textColour}">Dockbar</text>
</svg>`;
};

function render(svg, width, file) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: true } }).render().asPng();
  writeFileSync(`${OUT}/${file}`, png);
  console.log(`${OUT}/${file}`);
}

mkdirSync(OUT, { recursive: true });
render(icon, 256, "icon.png");
render(icon, 512, "icon@2x.png");
render(logo("#1E1440"), 830, "logo.png");
render(logo("#1E1440"), 1660, "logo@2x.png");
render(logo("#FFFFFF"), 830, "dark_logo.png");
render(logo("#FFFFFF"), 1660, "dark_logo@2x.png");
