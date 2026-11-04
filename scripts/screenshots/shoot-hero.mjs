// The six bars for docs/hero.png: one screenshot per look, taken from the real built bar.
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { start } from "./server.mjs";

const SERIF = "Georgia, 'Times New Roman', serif";
const LOOKS = ["soft", "soft-dark", "neon", "glass", "dock", "3d"];
// Blue 3D keys, a serif font on the frosted Glass bar, and the current page in amber on every bar.
const BLUE = { c1: "#1D5FA8", c2: "#3B8BE0" };
const out = new URL("./out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
await mkdir(out, { recursive: true });
const server = await start();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars"],
});
try {
  for (const look of LOOKS) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log("  pageerror:", e.message));
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
    const q = new URLSearchParams({ hero: look });
    q.set("active", "amber");
    if (look === "3d") { q.set("c1", BLUE.c1); q.set("c2", BLUE.c2); }
    if (look === "glass") q.set("font", SERIF);
    await page.goto(`http://localhost:8765/dashboard-main/0?${q}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelector("dockbar-nav")?.shadowRoot?.querySelector(".btn"), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${out}hero-${look}.png`, clip: { x: 0, y: 0, width: 132, height: 560 } });
    console.log("saved", look);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
