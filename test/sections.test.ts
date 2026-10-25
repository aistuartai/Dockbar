import { test } from "node:test";
import assert from "node:assert/strict";
import { childrenOf, groupOrder, isSection, moveWithin, parentOf, sectionFor } from "../src/sections.ts";
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

const ids = (l: DockbarButton[] | null) => l?.map((x) => x.id);

test("moving a top-level button steps over a whole section", () => {
  const list = [b("s"), b("c1", "s"), b("c2", "s"), b("x")];
  assert.deepEqual(ids(moveWithin(list, 3, -1)), ["x", "s", "c1", "c2"]);
  assert.deepEqual(ids(moveWithin(list, 0, 1)), ["x", "s", "c1", "c2"]);
});

test("a button inside a section moves only among its siblings", () => {
  const list = [b("s"), b("c1", "s"), b("c2", "s"), b("x")];
  assert.deepEqual(ids(moveWithin(list, 2, -1)), ["s", "c2", "c1", "x"]);
  assert.equal(moveWithin(list, 1, -1), null, "stays inside its section");
  assert.equal(moveWithin(list, 3, 1), null);
});
