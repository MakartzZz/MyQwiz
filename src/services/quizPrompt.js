import { QUESTION_TYPES } from "../domain/quizConstants.js";

export const promptQuestionTypes = [
  { id: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Selección múltiple", description: "Opciones con una única respuesta correcta" },
  { id: QUESTION_TYPES.TRUE_FALSE, label: "Verdadero o falso", description: "Una afirmación con respuesta booleana" },
  { id: QUESTION_TYPES.FILL_BLANK, label: "Completar", description: "Una o varias respuestas aceptadas" },
  { id: QUESTION_TYPES.MATCHING, label: "Asociar", description: "Parejas de conceptos relacionadas" },
  { id: QUESTION_TYPES.SHORT_ANSWER, label: "Respuesta breve", description: "Respuesta de referencia y palabras clave" },
];

export const promptEducationLevels = [
  { id: "preschool", label: "Preescolar" },
  { id: "primary", label: "Primaria" },
  { id: "secondary", label: "Secundaria" },
  { id: "technical", label: "Técnico o vocacional" },
  { id: "university", label: "Universidad" },
  { id: "postgraduate", label: "Posgrado" },
  { id: "professional", label: "Profesional o especializado" },
];

const questionStructures = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: `{
  "id": "question-id-unico",
  "type": "multiple-choice",
  "prompt": "Enunciado",
  "explanation": "Explicación breve de la respuesta",
  "options": [
    { "id": "option-id-unico-1", "text": "Opción", "isCorrect": true },
    { "id": "option-id-unico-2", "text": "Opción", "isCorrect": false }
  ]
}`,
  [QUESTION_TYPES.TRUE_FALSE]: `{
  "id": "question-id-unico",
  "type": "true-false",
  "prompt": "Afirmación que debe evaluarse",
  "explanation": "Explicación breve de por qué es verdadera o falsa",
  "correctAnswer": true
}`,
  [QUESTION_TYPES.FILL_BLANK]: `{
  "id": "question-id-unico",
  "type": "fill-blank",
  "prompt": "Enunciado con un espacio para completar",
  "explanation": "Explicación breve",
  "acceptedAnswers": ["respuesta aceptada"],
  "caseSensitive": false
}`,
  [QUESTION_TYPES.MATCHING]: `{
  "id": "question-id-unico",
  "type": "matching",
  "prompt": "Relaciona los elementos",
  "explanation": "Explicación breve",
  "pairs": [
    { "id": "pair-id-unico-1", "left": "Concepto", "right": "Pareja" },
    { "id": "pair-id-unico-2", "left": "Concepto", "right": "Pareja" }
  ]
}`,
  [QUESTION_TYPES.SHORT_ANSWER]: `{
  "id": "question-id-unico",
  "type": "short-answer",
  "prompt": "Pregunta de desarrollo breve",
  "explanation": "Explicación breve",
  "referenceAnswer": "Respuesta modelo completa",
  "keywords": ["palabra clave"],
  "similarityThreshold": 0.7
}`,
};

const safeFileName = (title) => title
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .toLowerCase() || "quiz-generado";

export const buildQuizPrompt = ({
  title,
  topic = "",
  iconId,
  delivery,
  questionCounts,
  educationLevel = "secondary",
  sourceMode = "ai",
}) => {
  const activeTypes = promptQuestionTypes.filter((type) => (questionCounts[type.id] ?? 0) > 0);
  const totalQuestions = activeTypes.reduce((total, type) => total + questionCounts[type.id], 0);
  const levelLabel = promptEducationLevels.find((level) => level.id === educationLevel)?.label ?? "Secundaria";
  const distribution = activeTypes
    .map((type) => `- ${questionCounts[type.id]} de ${type.label} (type: "${type.id}")`)
    .join("\n");
  const structures = activeTypes
    .map((type) => `Estructura para ${type.label}:\n${questionStructures[type.id]}`)
    .join("\n\n");
  const deliveryInstruction = delivery === "file"
    ? `Crea y adjunta un archivo llamado "${safeFileName(title)}.myqwiz.json". No entregues explicaciones adicionales fuera del archivo.`
    : "Devuelve únicamente el JSON final como texto, sin explicaciones, comentarios ni texto antes o después. Puede ir en un bloque ```json para poder copiarlo.";
  const sourceInstruction = sourceMode === "documents"
    ? `Voy a adjuntar uno o varios documentos junto con este prompt. Usa esos documentos como fuente principal y crea las preguntas únicamente a partir de la información que contienen. No inventes datos ni completes vacíos con información externa. Si algún contenido no es suficiente o no es claro, omítelo.`
    : `Genera el contenido utilizando tu conocimiento sobre este tema y enfoque:\n${topic.trim()}\n\nAsegúrate de que la información sea correcta, coherente y adecuada para el nivel indicado.`;

  return `Actúa como especialista en diseño educativo y creación de evaluaciones. Genera un quiz compatible con MyQwiz.

FUENTE DEL CONTENIDO
${sourceInstruction}

NIVEL EDUCATIVO
${levelLabel}. Adapta el vocabulario, la profundidad, la dificultad y el tipo de razonamiento a este nivel.

DATOS DEL QUIZ
- Título: ${title.trim()}
- Materia/iconId: ${iconId}
- Total exacto: ${totalQuestions} preguntas

DISTRIBUCIÓN OBLIGATORIA
${distribution}

REQUISITOS DE CONTENIDO
- Redacta preguntas claras, correctas y sin ambigüedades.
- Evita preguntas repetidas.
- Incluye una explicación útil en cada pregunta.
- En selección múltiple incluye al menos 2 opciones y exactamente una correcta.
- En cada pregunta de selección múltiple, redacta todas las opciones con una extensión, nivel de detalle, estructura gramatical, especificidad y volumen de información similares. La respuesta correcta no debe destacar por ser más larga, precisa, técnica o desarrollada que los distractores. Si la opción correcta necesita una explicación amplia, desarrolla los distractores con una profundidad comparable; si se trata de conceptos simples, mantén todas las opciones breves sin añadir texto de relleno.
- Crea distractores plausibles que exijan reconocer el concepto correcto y no puedan descartarse por su forma. Cuando la respuesta sea un término corto, puedes usar confusiones cercanas mediante inversión, orden, prefijos, sufijos o variantes parecidas; por ejemplo, frente a "zero-day", opciones como "day-zero" o "cero-day". Deben ser inequívocamente incorrectas en el contexto: no uses sinónimos, traducciones válidas, respuestas parcialmente correctas ni términos ambiguos.
- En verdadero o falso usa un booleano real en "correctAnswer": true o false, nunca texto.
- En asociar incluye al menos 2 parejas.
- Usa identificadores de texto únicos para el quiz, cada pregunta, opción y pareja.
- El quiz debe quedar completo y listo para jugar.

FORMATO FINAL OBLIGATORIO
El objeto raíz debe respetar exactamente esta estructura:
{
  "fileType": "myqwiz-quiz",
  "exportVersion": 1,
  "exportedAt": "fecha ISO 8601 actual",
  "quiz": {
    "schemaVersion": 2,
    "id": "quiz-id-unico",
    "title": "${title.trim()}",
    "description": "Descripción breve del contenido",
    "iconId": "${iconId}",
    "status": "ready",
    "createdAt": "fecha ISO 8601 actual",
    "updatedAt": "fecha ISO 8601 actual",
    "preferences": { "themeId": null, "playlistId": null },
    "settings": { "shuffleQuestions": true, "shuffleAnswers": true },
    "stats": { "attempts": 0, "bestScore": null, "lastPlayedAt": null },
    "questions": []
  }
}

Reemplaza el arreglo vacío "questions" con las ${totalQuestions} preguntas solicitadas utilizando únicamente estas estructuras:

${structures}

ENTREGA
${deliveryInstruction}`;
};
