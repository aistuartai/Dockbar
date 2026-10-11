// Copies the integration (with the freshly built frontend) into a Home Assistant config folder
// for testing. Set DOCKBAR_DEPLOY_DIR, or put the HA config folder in a gitignored
// .deploy-target file, e.g. \\homeassistant\config
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const config =
  process.env.DOCKBAR_DEPLOY_DIR ??
  (existsSync(".deploy-target") ? readFileSync(".deploy-target", "utf8").trim() : "");

if (!config) {
  console.error("No deploy target. Set DOCKBAR_DEPLOY_DIR or create a .deploy-target file.");
  process.exit(1);
}
if (!existsSync(join(config, "configuration.yaml"))) {
  console.error(`${config} doesn't look like a Home Assistant config folder (no configuration.yaml).`);
  process.exit(1);
}

const target = join(config, "custom_components", "dockbar");
cpSync("custom_components/dockbar", target, {
  recursive: true,
  filter: (src) => !src.includes("__pycache__"),
});
console.log(`Deployed custom_components/dockbar -> ${target}`);
