import anatomy from "./anatomy.json";
import art from "./art.json";
import biology from "./biology.json";
import chemistry from "./chemistry.json";
import cinema from "./cinema.json";
import general from "./general.json";
import geography from "./geography.json";
import history from "./history.json";
import languages from "./languages.json";
import mathematics from "./mathematics.json";
import medicine from "./medicine.json";
import music from "./music.json";
import physics from "./physics.json";
import science from "./science.json";
import technology from "./technology.json";
import videogames from "./videogames.json";
import { normalizeQuickQuizCollection } from "./normalize.js";

const collections = [
  general,
  mathematics,
  science,
  chemistry,
  history,
  languages,
  technology,
  medicine,
  anatomy,
  biology,
  physics,
  geography,
  videogames,
  music,
  art,
  cinema,
];

export const quickQuizzes = collections.flatMap(normalizeQuickQuizCollection);
