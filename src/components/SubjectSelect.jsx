import Select from "react-select";
import { QuizIcon, quizIconOptions } from "./QuizIcon.jsx";

const SubjectOption = ({ option }) => (
  <span className="quiz-subject-option">
    <span><QuizIcon iconId={option.iconId} size={17} /></span>
    {option.label}
  </span>
);

function SubjectSelect({ value, onChange, includeAll = false, label = "Materia", className = "" }) {
  const options = [
    ...(includeAll ? [{ value: "all", label: "Todas las materias", iconId: undefined }] : []),
    ...quizIconOptions.map((option) => ({ value: option.id, label: option.label, iconId: option.id })),
  ];

  return (
    <div className={`subject-select-field ${className}`.trim()}>
      <span>{label}</span>
      <Select
        aria-label={label}
        className="quiz-subject-select"
        classNamePrefix="quiz-subject-select"
        isSearchable={false}
        unstyled
        options={options}
        value={options.find((option) => option.value === value) ?? options[0]}
        onChange={(option) => option && onChange(option.value)}
        formatOptionLabel={(option) => <SubjectOption option={option} />}
      />
    </div>
  );
}

export default SubjectSelect;
