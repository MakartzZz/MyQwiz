export const normalizeQuestionImageUrl = (value) => (
  typeof value === "string" ? value.trim() : ""
);

export const isSupportedQuestionImageUrl = (value) => {
  const normalizedUrl = normalizeQuestionImageUrl(value);
  if (!normalizedUrl) return false;

  try {
    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
};
