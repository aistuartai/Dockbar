import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { start } from "./server.mjs";

const out = new URL("./out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
await mkdir(out, { recursive: true });
const server = await start();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });
  await page.goto("http://localhost:8765/config?light", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelector("dockbar-nav")?.shadowRoot?.querySelector(".btn"), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${out}bar-page.png`, clip: { x: 0, y: 0, width: 1000, height: 640 } });
  console.log("saved bar-page");
} finally {
  await browser.close();
  server.close();
}
