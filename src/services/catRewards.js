const STORAGE_KEY = "myqwiz:cat-rewards:v1";
const CORRECT_ANSWERS_PER_FOOD = 5;
const FOOD_SHAPES = ["circle", "triangle", "square", "diamond", "capsule"];

const emptyStacks = () => Object.fromEntries(FOOD_SHAPES.map((shape) => [shape, 0]));

const stacksFromLegacyFood = (food) => {
  const stacks = emptyStacks();
  for (let index = 0; index < food; index += 1) {
    stacks[FOOD_SHAPES[index % FOOD_SHAPES.length]] += 1;
  }
  return stacks;
};

const defaultState = () => ({
  correctProgress: 0,
  food: 0,
  foodStacks: emptyStacks(),
  nextFoodIndex: 0,
  totalFed: 0,
});

const normalizeState = (value) => {
  const legacyFood = Math.max(0, Math.floor(Number(value?.food) || 0));
  const foodStacks = value?.foodStacks && typeof value.foodStacks === "object"
    ? Object.fromEntries(FOOD_SHAPES.map((shape) => [
      shape,
      Math.max(0, Math.floor(Number(value.foodStacks[shape]) || 0)),
    ]))
    : stacksFromLegacyFood(legacyFood);

  return {
    correctProgress: Math.max(0, Math.min(4, Number(value?.correctProgress) || 0)),
    food: Object.values(foodStacks).reduce((total, count) => total + count, 0),
    foodStacks,
    nextFoodIndex: Math.max(0, Math.floor(Number(value?.nextFoodIndex) || 0)) % FOOD_SHAPES.length,
    totalFed: Math.max(0, Math.floor(Number(value?.totalFed) || 0)),
  };
};

const read = () => {
  try {
    return normalizeState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"));
  } catch {
    return defaultState();
  }
};

const write = (state) => {
  const normalized = normalizeState(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const catRewards = {
  get() {
    return read();
  },

  recordCorrectAnswer() {
    const current = read();
    const accumulated = current.correctProgress + 1;
    const earned = Math.floor(accumulated / CORRECT_ANSWERS_PER_FOOD);
    const foodStacks = { ...current.foodStacks };
    let nextFoodIndex = current.nextFoodIndex;
    if (earned) {
      const shape = FOOD_SHAPES[nextFoodIndex];
      foodStacks[shape] += earned;
      nextFoodIndex = (nextFoodIndex + earned) % FOOD_SHAPES.length;
    }
    return {
      state: write({
        ...current,
        correctProgress: accumulated % CORRECT_ANSWERS_PER_FOOD,
        foodStacks,
        nextFoodIndex,
      }),
      earned,
    };
  },

  feed(requestedShape) {
    const current = read();
    if (current.food <= 0) return current;
    const shape = FOOD_SHAPES.includes(requestedShape) && current.foodStacks[requestedShape] > 0
      ? requestedShape
      : FOOD_SHAPES.find((candidate) => current.foodStacks[candidate] > 0);
    const foodStacks = { ...current.foodStacks, [shape]: current.foodStacks[shape] - 1 };
    return write({
      ...current,
      foodStacks,
      totalFed: current.totalFed + 1,
    });
  },
};

export { CORRECT_ANSWERS_PER_FOOD, FOOD_SHAPES };
