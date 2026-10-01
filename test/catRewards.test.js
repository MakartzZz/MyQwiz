import assert from "node:assert/strict";
import test from "node:test";
import { catRewards } from "../src/services/catRewards.js";

test("the sidebar cat earns one food every five correct answers", () => {
  const storedValues = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => storedValues.get(key) ?? null,
      setItem: (key, value) => storedValues.set(key, value),
    },
  };

  try {
    for (let index = 0; index < 4; index += 1) catRewards.recordCorrectAnswer();
    assert.equal(catRewards.get().correctProgress, 4);
    assert.equal(catRewards.get().food, 0);

    const reward = catRewards.recordCorrectAnswer();
    assert.equal(reward.earned, 1);
    assert.equal(reward.state.correctProgress, 0);
    assert.equal(reward.state.food, 1);
    assert.equal(reward.state.foodStacks.circle, 1);

    const fed = catRewards.feed("circle");
    assert.equal(fed.food, 0);
    assert.equal(fed.foodStacks.circle, 0);
    assert.equal(fed.totalFed, 1);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("repeated cat food shapes are stored in stacks", () => {
  const storedValues = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => storedValues.get(key) ?? null,
      setItem: (key, value) => storedValues.set(key, value),
    },
  };

  try {
    for (let index = 0; index < 30; index += 1) catRewards.recordCorrectAnswer();
    const rewards = catRewards.get();
    assert.equal(rewards.food, 6);
    assert.equal(rewards.foodStacks.circle, 2);
    assert.equal(rewards.foodStacks.triangle, 1);

    const afterFeeding = catRewards.feed("circle");
    assert.equal(afterFeeding.foodStacks.circle, 1);
    assert.equal(afterFeeding.food, 5);
  } finally {
    globalThis.window = previousWindow;
  }
});
