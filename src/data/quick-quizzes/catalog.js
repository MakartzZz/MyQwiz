import { quickQuizCatalog } from "./catalog.generated.js";
import { normalizeQuickQuizCollection } from "./normalize.js";

const collectionLoaders = {
  anatomy: () => import("./anatomy.json"),
  art: () => import("./art.json"),
  biology: () => import("./biology.json"),
  chemistry: () => import("./chemistry.json"),
  cinema: () => import("./cinema.json"),
  general: () => import("./general.json"),
  geography: () => import("./geography.json"),
  history: () => import("./history.json"),
  languages: () => import("./languages.json"),
  mathematics: () => import("./mathematics.json"),
  medicine: () => import("./medicine.json"),
  music: () => import("./music.json"),
  physics: () => import("./physics.json"),
  science: () => import("./science.json"),
  technology: () => import("./technology.json"),
  videogames: () => import("./videogames.json"),
};

const collectionCache = new Map();

const loadCollection = (category) => {
  if (!collectionLoaders[category]) return Promise.resolve([]);
  if (!collectionCache.has(category)) {
    collectionCache.set(category, collectionLoaders[category]().then(({ default: collection }) => (
      normalizeQuickQuizCollection(collection)
    )));
  }
  return collectionCache.get(category);
};

export { quickQuizCatalog };

export const loadQuickQuiz = async (quizId) => {
  const metadata = quickQuizCatalog.find((quiz) => quiz.id === quizId);
  if (!metadata) return null;
  const collection = await loadCollection(metadata.category);
  return collection.find((quiz) => quiz.id === quizId) ?? null;
};
