import {
  ArrowLeftRight,
  ListChecks,
  MessageSquareText,
  TextCursorInput,
  ToggleLeft,
} from "lucide-react";
import { QUESTION_TYPES } from "../domain/quizConstants.js";

export const questionTypeOptions = [
  { id: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Selección múltiple", Icon: ListChecks },
  { id: QUESTION_TYPES.TRUE_FALSE, label: "Verdadero o falso", Icon: ToggleLeft },
  { id: QUESTION_TYPES.FILL_BLANK, label: "Completar", Icon: TextCursorInput },
  { id: QUESTION_TYPES.MATCHING, label: "Relacionar", Icon: ArrowLeftRight },
  { id: QUESTION_TYPES.SHORT_ANSWER, label: "Respuesta corta", Icon: MessageSquareText },
];

function QuestionTypeSummary({ quiz, className, emptyLabel = null, iconSize = 17 }) {
  const includedTypes = questionTypeOptions.map((type) => ({
    ...type,
    count: quiz.questionTypeCounts?.[type.id]
      ?? quiz.questions?.filter((question) => question.type === type.id).length
      ?? 0,
  })).filter((type) => type.count > 0);

  return (
    <div className={className} aria-label="Preguntas por tipo">
      {includedTypes.length ? includedTypes.map(({ id, label, Icon, count }) => (
        <span key={id} title={`${label}: ${count}`} aria-label={`${label}: ${count}`}>
          <Icon size={iconSize} aria-hidden="true" />
          <small>{count}</small>
        </span>
      )) : emptyLabel ? <small>{emptyLabel}</small> : null}
    </div>
  );
}

export default QuestionTypeSummary;
