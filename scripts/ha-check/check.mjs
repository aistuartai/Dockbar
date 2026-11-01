// Checks Dockbar against a running Home Assistant (the beta or dev image, started by the workflow).
// Onboards a throwaway user, adds the integration through its config flow, opens the UI in headless
// Chrome, and fails if the bar never appears or Dockbar reports a Home Assistant hook gone missing.
//
//   node check.mjs [http://localhost:8123]
//
// Chrome comes from CHROME_PATH (the GitHub runner has /usr/bin/google-chrome).
import puppeteer from "puppeteer-core";

const BASE = (process.argv[2] ?? "http://localhost:8123").replace(/\/$/, "");
const CLIENT_ID = `${BASE}/`;
const USER = { name: "Check", username: "check", password: "check-Password-1", language: "en" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, { method = "GET", body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: form ? new URLSearchParams(form) : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function waitForHa() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${BASE}/api/onboarding`);
      if (res.ok) return await res.json();
    } catch {
      // Not listening yet.
    }
    await sleep(2000);
  }
  throw new Error("Home Assistant did not start within 4 minutes");
}

async function onboard() {
  const steps = await waitForHa();
  const todo = new Set(steps.filter((s) => !s.done).map((s) => s.step));
  if (!todo.has("user")) throw new Error("expected a fresh Home Assistant that still needs onboarding");
  const { auth_code } = await api("/api/onboarding/users", { method: "POST", body: { client_id: CLIENT_ID, ...USER } });
  const tokens = await api("/auth/token", {
    method: "POST",
    form: { grant_type: "authorization_code", code: auth_code, client_id: CLIENT_ID },
  });
  for (const step of ["core_config", "analytics", "integration"]) {
    if (!todo.has(step)) continue;
    const body = step === "integration" ? { client_id: CLIENT_ID, redirect_uri: CLIENT_ID } : {};
    await api(`/api/onboarding/${step}`, { method: "POST", body, token: tokens.access_token });
  }
  return tokens;
}

async function addDockbar(token) {
  let flow = await api("/api/config/config_entries/flow", { method: "POST", body: { handler: "dockbar", show_advanced_options: false }, token });
  if (flow.type === "form") flow = await api(`/api/config/config_entries/flow/${flow.flow_id}`, { method: "POST", body: {}, token });
  if (flow.type !== "create_entry") throw new Error(`config flow ended as "${flow.type}": ${JSON.stringify(flow).slice(0, 300)}`);
}

const tokens = await onboard();
console.log("onboarded");
await addDockbar(tokens.access_token);
console.log("Dockbar added through its config flow");

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const problems = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  const warnings = [];
  page.on("console", (m) => {
    if (m.text().includes("Dockbar")) {
      console.log(`  console.${m.type()}:`, m.text());
      if (m.type() === "warning" || m.type() === "error") warnings.push(m.text());
    }
  });
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));

  // Sign the browser in the way the Home Assistant frontend expects to find a session.
  const hassTokens = JSON.stringify({
    ...tokens,
    hassUrl: BASE,
    clientId: CLIENT_ID,
    expires: Date.now() + tokens.expires_in * 1000,
  });
  await page.evaluateOnNewDocument((value) => localStorage.setItem("hassTokens", value), hassTokens);
  await page.goto(`${BASE}/lovelace/0`, { waitUntil: "domcontentloaded" });

  const barShown = await page
    .waitForFunction(() => {
      const bar = document.querySelector("dockbar-nav");
      const r = bar?.getBoundingClientRect();
      return !!r && r.width > 0 && r.height > 0;
    }, { timeout: 60000 })
    .then(() => true, () => false);
  if (!barShown) problems.push("the bar never appeared on the page");

  // checkHooks runs a few seconds after load; wait for it, then read what it said.
  await sleep(8000);
  // These strings are Dockbar's own console messages in src/dockbar.ts; change both together.
  for (const w of warnings) if (w.includes("doesn't look as expected")) problems.push(w);
  if (warnings.some((w) => w.includes("failed to start"))) problems.push("Dockbar logged a start-up error");
  await page.screenshot({ path: "ha-check.png" });
} finally {
  await browser.close();
}

if (problems.length) {
  console.error("FAILED:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("OK: the bar appeared and every Home Assistant hook was found");
