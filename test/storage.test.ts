import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { LayerStore } from "../src/storage.ts";
import { LAYER_VERSION } from "../src/config.ts";
import type { FrontendData, FrontendDataScope } from "../src/ha.ts";

/** A browser's localStorage, optionally one that refuses writes like a full or blocked one. */
function fakeStorage(opts: { failWrites?: boolean } = {}) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.failWrites) throw new Error("QuotaExceededError");
      items.set(k, v);
    },
    removeItem: (k: string) => void items.delete(k),
  };
}

function setup(opts: { storage?: ReturnType<typeof fakeStorage> } = {}) {
  const storage = opts.storage ?? fakeStorage();
  (globalThis as any).window = { localStorage: storage, addEventListener() {} };
  const sent: { scope: FrontendDataScope; value: unknown }[] = [];
  const values: Partial<Record<FrontendDataScope, unknown>> = {};
  let fail: Partial<Record<FrontendDataScope, boolean>> = {};
  let silent = false;
  const data: FrontendData = {
    subscribe: async (scope, onValue) => {
      if (fail[scope]) throw new Error("no access");
      if (!silent) onValue(values[scope] ?? null);
    },
    set: async (scope, value) => void sent.push({ scope, value }),
  };
  return {
    storage,
    sent,
    values,
    data,
    failOn: (scope: FrontendDataScope) => (fail = { ...fail, [scope]: true }),
    goQuiet: () => (silent = true),
  };
}

test("start reads the shared and user layers", async () => {
  const t = setup();
  t.values.system = { size: 70 };
  t.values.user = { gap: 3 };
  const store = new LayerStore(t.data, () => {});
  await store.start();
  assert.equal(store.shared?.size, 70);
  assert.equal(store.user?.gap, 3);
});

test("a layer that can't be read doesn't stop the others loading", async () => {
  const t = setup();
  t.values.user = { gap: 3 };
  t.failOn("system");
  const store = new LayerStore(t.data, () => {});
  await store.start();
  assert.equal(store.shared, null);
  assert.equal(store.user?.gap, 3);
});

test("start carries on after 5 seconds if Home Assistant never answers", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const t = setup();
    t.goQuiet();
    const store = new LayerStore(t.data, () => {});
    const started = store.start();
    mock.timers.tick(5000);
    await started;
    assert.equal(store.shared, null);
  } finally {
    mock.timers.reset();
  }
});

test("saving stamps the layer with a version, and an empty layer clears it", async () => {
  const t = setup();
  const store = new LayerStore(t.data, () => {});
  await store.start();
  await store.save("shared", { size: 90 });
  await store.save("user", {});
  assert.deepEqual(t.sent, [
    { scope: "system", value: { size: 90, version: LAYER_VERSION } },
    { scope: "user", value: null },
  ]);
});

test("a layer saved by a newer Dockbar is not overwritten", async () => {
  const t = setup();
  t.values.system = { size: 70, version: LAYER_VERSION + 1 };
  const store = new LayerStore(t.data, () => {});
  await store.start();
  await assert.rejects(store.save("shared", { size: 90 }), /newer Dockbar/);
  assert.deepEqual(t.sent, []);
});

test("the device layer is kept in localStorage and survives a damaged value", async () => {
  const t = setup();
  const changes: number[] = [];
  const store = new LayerStore(t.data, () => changes.push(1));
  await store.start();
  await store.save("device", { gap: 4 });
  assert.deepEqual(JSON.parse(t.storage.items.get("dockbar:device")!), { gap: 4, version: LAYER_VERSION });
  assert.equal(store.device?.gap, 4);
  assert.equal(changes.length, 1);
  await store.save("device", null);
  assert.equal(t.storage.items.has("dockbar:device"), false);

  t.storage.items.set("dockbar:device", "{not json");
  assert.equal(new LayerStore(t.data, () => {}).device, null);
});

test("a full or blocked localStorage is reported, not swallowed", async () => {
  const t = setup({ storage: fakeStorage({ failWrites: true }) });
  const store = new LayerStore(t.data, () => {});
  await store.start();
  await assert.rejects(store.save("device", { gap: 4 }), /Couldn't save to this device/);
  assert.equal(store.device, null, "nothing is shown as saved");
});
