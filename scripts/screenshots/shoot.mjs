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
  page.on("console", (m) => console.log("  console:", m.text()));
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await page.setViewport({ width: 1000, height: 1250, deviceScaleFactor: 2 });
  await page.goto("http://localhost:8765/?dockbar=edit", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelector("dockbar-editor")?.shadowRoot?.querySelector(".dialog"), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  const editor = (fn, ...args) => page.evaluate(fn, ...args);
  const rect = () =>
    editor(() => {
      const r = document.querySelector("dockbar-editor").shadowRoot.querySelector(".dialog").getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
  const shot = async (name, pad = 0) => {
    const r = await rect();
    await page.screenshot({
      path: `${out}${name}.png`,
      clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2 },
    });
    console.log("saved", name, Math.round(r.width), "x", Math.round(r.height));
  };
  const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

  await page.screenshot({ path: `${out}page.png` });

  // General tab
  await editor(() => { document.querySelector("dockbar-editor").tab = "general"; });
  await settle();
  await shot("general");

  // Buttons tab with the garage toggle open
  await editor(() => {
    const ed = document.querySelector("dockbar-editor");
    ed.tab = "buttons";
    ed.expanded = "garage";
  });
  await settle();
  await editor(() => {
    const main = document.querySelector("dockbar-editor").shadowRoot.querySelector("main");
    main.querySelector("li.open")?.scrollIntoView({ block: "start" });
  });
  await settle(300);
  await shot("buttons-toggle");

  // The action picker, searching as you type
  await editor(() => { document.querySelector("dockbar-editor").expanded = "movie"; });
  await settle();
  await editor(() => {
    const ed = document.querySelector("dockbar-editor");
    ed.shadowRoot.querySelector("main li.open")?.scrollIntoView({ block: "start" });
  });
  await settle(300);
  await editor(() => {
    const picker = document.querySelector("dockbar-editor").shadowRoot.querySelector('dockbar-picker[label="Action"]');
    const input = picker.shadowRoot.querySelector("input");
    input.focus();
    input.value = "turn on";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(500);
  await shot("buttons-picker", 24);

  // The button list collapsed, to show sections and badges in the list
  await editor(() => {
    const ed = document.querySelector("dockbar-editor");
    ed.shadowRoot.querySelector('dockbar-picker[label="Action"]')?.shadowRoot.querySelector("input")?.blur();
    ed.expanded = null;
    ed.shadowRoot.querySelector("main").scrollTop = 0;
  });
  await settle();
  await shot("buttons-list");
} finally {
  await browser.close();
  server.close();
}
