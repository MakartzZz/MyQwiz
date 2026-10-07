import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const directory = fileURLToPath(new URL("../src/data/quick-quizzes/", import.meta.url));
const outputPath = path.join(directory, "catalog.generated.js");
const filenames = (await readdir(directory))
  .filter((filename) => filename.endsWith(".json"))
  .sort();

const catalog = [];
for (const filename of filenames) {
  const collection = JSON.parse(await readFile(path.join(directory, filename), "utf8"));
  const questions = new Map(collection.questions.map((question) => [question.id, question]));
  collection.quizzes.forEach((quiz) => {
    const questionTypeCounts = {};
    quiz.questionIds.forEach((questionId) => {
      const question = questions.get(questionId);
      if (!question) throw new Error(`Pregunta inexistente: ${collection.category}/${questionId}`);
      questionTypeCounts[question.type] = (questionTypeCounts[question.type] ?? 0) + 1;
    });
    catalog.push({
      id: `quick-${collection.category}-${quiz.id}`,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      iconId: collection.category,
      category: collection.category,
      questionCount: quiz.questionIds.length,
      questionTypeCounts,
      stats: { attempts: 0, bestScore: null, lastPlayedAt: null },
    });
  });
}

const source = `// Generado por scripts/generate_quick_quiz_catalog.mjs. No editar a mano.\nexport const quickQuizCatalog = Object.freeze(${JSON.stringify(catalog, null, 2)});\n`;
await writeFile(outputPath, source, "utf8");
console.log(`Catálogo rápido actualizado: ${catalog.length} quizzes.`);
