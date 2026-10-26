import { test } from "node:test";
import assert from "node:assert/strict";
import { searchOptions, type PickerOption } from "../src/search.ts";

const entities: PickerOption[] = [
  { value: "light.kitchen_ceiling", label: "Kitchen Ceiling Light" },
  { value: "light.lounge", label: "Lounge Lamp" },
  { value: "sensor.kitchen_temperature", label: "Kitchen Temperature" },
  { value: "switch.light_garage", label: "Garage Light" },
  { value: "cover.garage" },
  { value: "scene.movie_night", label: "Movie Night" },
];
const values = (r: { shown: PickerOption[] }) => r.shown.map((o) => o.value);

test("an empty search shows the list as it is", () => {
  const r = searchOptions(entities, "");
  assert.equal(r.total, 6);
  assert.deepEqual(values(r), entities.map((o) => o.value));
  assert.equal(searchOptions(entities, "  ").total, 6);
});

test("every word has to match, anywhere in the value or the name", () => {
  assert.deepEqual(values(searchOptions(entities, "kitchen light")), ["light.kitchen_ceiling"]);
  assert.deepEqual(values(searchOptions(entities, "Lamp")), ["light.lounge"]);
  assert.deepEqual(values(searchOptions(entities, "movie_night")), ["scene.movie_night"]);
  assert.deepEqual(values(searchOptions(entities, "nothing like this")), []);
});

test("matches that start a word come before ones buried in a word", () => {
  const out = values(searchOptions(entities, "light"));
  assert.equal(out[0], "light.kitchen_ceiling", "starts with the typed word and is alphabetical among equals");
  assert.ok(out.indexOf("light.lounge") < out.indexOf("switch.light_garage"));
});

test("an exact entity id is first", () => {
  assert.equal(searchOptions(entities, "cover.garage").shown[0].value, "cover.garage");
  const options: PickerOption[] = [{ value: "light.kitchen_extra" }, { value: "light.kitchen" }];
  assert.equal(searchOptions(options, "light.kitchen").shown[0].value, "light.kitchen");
});

test("only the first results are shown, but the total is reported", () => {
  const many = Array.from({ length: 200 }, (_, i) => ({ value: `sensor.s${String(i).padStart(3, "0")}` }));
  const r = searchOptions(many, "sensor", 60);
  assert.equal(r.shown.length, 60);
  assert.equal(r.total, 200);
});

test("characters that mean something in a regular expression are just characters", () => {
  assert.deepEqual(values(searchOptions(entities, "(")), []);
  assert.deepEqual(values(searchOptions(entities, "[a-z")), []);
});
