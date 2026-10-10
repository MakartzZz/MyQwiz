import { useEffect, useState } from "react";

const loadingMessages = [
  "Preparando quizzes…",
  "Mezclando preguntas…",
  "Alimentando a Qwiz…",
  "Ya casi está listo…",
];

export default function QwizLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1350);

    return () => window.clearInterval(messageInterval);
  }, []);

  return (
    <section
      className="feature-loading feature-loading--qwiz"
      role="status"
      aria-live="polite"
    >
      <div className="qwiz-loader">
        <div className="qwiz-loader__stage" aria-hidden="true">
          <span className="qwiz-loader__mascot">
            <svg viewBox="0 0 96 84" role="presentation">
              <path d="M48 82C19 82 8 62 9 37 10 16 18 3 28 3 38 3 42 18 44 33h8C54 18 58 3 68 3c10 0 18 13 19 34 1 25-10 45-39 45Z" />
              <g>
                <rect x="30" y="46" width="11" height="24" rx="5.5" />
                <rect x="55" y="46" width="11" height="24" rx="5.5" />
              </g>
            </svg>
          </span>
          <span className="qwiz-loader__shadow" />
        </div>
        <p className="qwiz-loader__message" key={messageIndex}>
          {loadingMessages[messageIndex]}
        </p>
      </div>
    </section>
  );
}
