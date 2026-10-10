import { useEffect, useState } from "react";
import { isSupportedQuestionImageUrl, normalizeQuestionImageUrl } from "../domain/questionImage.js";

export default function QuestionImage({ src, className = "", loading = "lazy" }) {
  const [hasFailed, setHasFailed] = useState(false);
  const imageUrl = normalizeQuestionImageUrl(src);

  useEffect(() => {
    setHasFailed(false);
  }, [imageUrl]);

  if (!isSupportedQuestionImageUrl(imageUrl)) return null;

  if (hasFailed) {
    return (
      <div className={`${className} question-image is-error`} role="status">
        <span>No pudimos cargar la imagen. Revisa que el enlace sea público.</span>
      </div>
    );
  }

  return (
    <figure className={`${className} question-image`}>
      <img
        src={imageUrl}
        alt="Imagen de apoyo para la pregunta"
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setHasFailed(true)}
      />
    </figure>
  );
}
