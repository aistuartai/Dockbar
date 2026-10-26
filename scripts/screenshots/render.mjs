// Renders the README's screenshots from the real built Dockbar, then frames them.
//   node render.mjs           renders into ./out, ./framed, ./phones and ./built
//   node render.mjs --copy    also copies the results into the repo's docs folder
// Run `npm run build` in the repo root first, so the bundle is current.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../..");
const python = process.env.PYTHON ?? "python";
const run = (cmd, args) => execFileSync(cmd, args, { cwd: here, stdio: "inherit" });

if (!existsSync(join(repo, "custom_components/dockbar/frontend/dockbar.js"))) {
  console.error("No built bundle. Run `npm run build` in the repo root first.");
  process.exit(1);
}
for (const d of ["out", "framed", "phones", "built"]) mkdirSync(join(here, d), { recursive: true });

console.log("Rendering the settings dialog, the bar and the phones in Chrome...");
for (const script of ["shoot.mjs", "shoot-bar.mjs", "shoot-phones.mjs"]) run(process.execPath, [script]);

console.log("Framing them...");
run(python, ["compose.py", "out", "framed"]);
run(python, ["compose-phones.py", "out", "phones"]);
run(python, ["compose-page.py", "out/bar-page.png", join(repo, "custom_components/dockbar/brand"), "built/hero-page.png"]);

if (process.argv.includes("--copy")) {
  const copies = [
    ["framed/settings-general.png", "settings-general.png"],
    ["framed/settings-list.png", "settings-list.png"],
    ["framed/settings-toggle.png", "settings-toggle.png"],
    ["framed/settings-actions.png", "settings-actions.png"],
    ["phones/phone-a.png", "phones.png"],
    ["built/hero-page.png", "hero-page.png"],
  ];
  for (const [from, to] of copies) copyFileSync(join(here, from), join(repo, "docs", to));
  console.log(`Copied ${copies.length} images into docs/.`);
}
