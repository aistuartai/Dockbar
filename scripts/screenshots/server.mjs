// A tiny static server for the screenshot page: the page, the built Dockbar bundle, and the Material Design icons.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = process.env.DOCKBAR_REPO ?? join(here, "../..");
const files = {
  "/": [join(here, "page.html"), "text/html"],
  "/dockbar.js": [join(repo, "custom_components/dockbar/frontend/dockbar.js"), "text/javascript"],
  "/phone.js": [join(here, "phone.js"), "text/javascript"],
  "/mdi.js": [join(here, "node_modules/@mdi/js/mdi.js"), "text/javascript"],
};

export function start(port = 8765) {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    const entry = files[path] ?? (/\.[a-z]+$/.test(path) ? undefined : files["/"]);
    if (!entry) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": entry[1], "cache-control": "no-store" });
    res.end(await readFile(entry[0]));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
