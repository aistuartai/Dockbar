import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { start } from "./server.mjs";

const out = new URL("./out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
await mkdir(out, { recursive: true });
const SHOTS = [
  { name: "phone-neon-top", look: "neon", pos: "top", theme: "dark" },
  { name: "phone-soft-bottom", look: "soft", pos: "bottom", theme: "light" },
  { name: "phone-3d-bottom", look: "3d", pos: "bottom", theme: "dark" },
  { name: "phone-glass-top", look: "glass", pos: "top", theme: "dark" },
  { name: "phone-dock-bottom", look: "dock", pos: "bottom", theme: "dark" },
  { name: "phone-softdark-bottom", look: "soft-dark", pos: "bottom", theme: "dark" },
];
const server = await start();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars"],
});
try {
  for (const s of SHOTS) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log("  pageerror:", e.message));
    await page.setViewport({ width: 360, height: 720, deviceScaleFactor: 3, isMobile: false, hasTouch: true });
    const cdp = await page.createCDPSession();
    try {
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 30, bottom: 22, left: 0, right: 0 } });
    } catch (e) {
      console.log("  safe-area override not available:", e.message);
    }
    await page.goto(`http://localhost:8765/dashboard-main/0?phone=${s.look}&pos=${s.pos}&theme=${s.theme}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelector("dockbar-nav")?.shadowRoot?.querySelector(".btn"), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: `${out}${s.name}.png` });
    console.log("saved", s.name);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
