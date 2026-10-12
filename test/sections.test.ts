import { test } from "node:test";
import assert from "node:assert/strict";
import { childrenOf, groupOrder, isSection, parentOf, sectionFor } from "../src/sections.ts";
import type { DockbarButton } from "../src/config.ts";

const b = (id: string, parent?: string): DockbarButton => ({ id, action: "navigate", path: `/${id}`, ...(parent ? { parent } : {}) });

test("only valid one-level parents count", () => {
  const list = [b("energy"), b("solar", "energy"), b("deep", "solar"), b("self", "self"), b("lost", "missing")];
  assert.equal(parentOf(list, list[1]), "energy");
  assert.equal(parentOf(list, list[2]), undefined, "no sections inside sections");
  assert.equal(parentOf(list, list[3]), undefined);
  assert.equal(parentOf(list, list[4]), undefined, "a missing parent makes it top level");
  assert.equal(isSection(list, list[0]), true);
  assert.equal(isSection(list, list[1]), false);
});

test("grouping puts each section's buttons straight after it", () => {
  const list = [b("energy"), b("home"), b("battery", "energy"), b("media"), b("solar", "energy"), b("music", "media")];
  assert.deepEqual(groupOrder(list).map((x) => x.id), ["energy", "battery", "solar", "home", "media", "music"]);
  assert.deepEqual(childrenOf(list, "energy").map((x) => x.id), ["battery", "solar"]);
});

test("the open section follows the current page", () => {
  const list = [b("energy"), b("solar", "energy"), b("home")];
  assert.equal(sectionFor(list, 1), "energy");
  assert.equal(sectionFor(list, 0), "energy");
  assert.equal(sectionFor(list, 2), null);
  assert.equal(sectionFor(list, -1), null);
});
