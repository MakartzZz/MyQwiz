import assert from "node:assert/strict";
import test from "node:test";
import { SOUND_EFFECT_GROUPS, SOUND_EFFECT_PATHS } from "../src/services/soundBuffer.js";

test("sound preload groups cover every registered effect exactly once", () => {
  const groupedPaths = Object.values(SOUND_EFFECT_GROUPS).flat();
  assert.equal(new Set(groupedPaths).size, groupedPaths.length);
  assert.deepEqual([...groupedPaths].sort(), [...SOUND_EFFECT_PATHS].sort());
});
