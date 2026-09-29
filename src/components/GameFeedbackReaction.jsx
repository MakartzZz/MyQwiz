import brokenClock from "../assets/game-feedback/broken-clock.png";
import brokenHeart from "../assets/game-feedback/broken-heart.png";
import thumbMidnight from "../assets/game-feedback/thumb-midnight.png";
import thumbPink from "../assets/game-feedback/thumb-pink.png";
import thumbSky from "../assets/game-feedback/thumb-sky.png";
import thumbViolet from "../assets/game-feedback/thumb-violet.png";

const reactionLabels = {
  correct: "Respuesta correcta",
  wrong: "Respuesta incorrecta",
  life: "Vida perdida",
  timeout: "Tiempo agotado",
};

const themeThumbs = {
  violet: thumbViolet,
  sky: thumbSky,
  midnight: thumbMidnight,
  pink: thumbPink,
};

function ReactionArtwork({ type, theme }) {
  if (type === "correct" || type === "wrong") {
    return (
      <span className={`game-feedback-reaction__art game-feedback-reaction__hand${type === "wrong" ? " is-down" : ""}`} aria-hidden="true">
        <img src={themeThumbs[theme] ?? themeThumbs.violet} alt="" />
      </span>
    );
  }

  return (
    <img
      className={`game-feedback-reaction__art is-${type}`}
      src={type === "life" ? brokenHeart : brokenClock}
      alt=""
      aria-hidden="true"
    />
  );
}

export default function GameFeedbackReaction({ type, theme }) {
  if (!type) return null;

  return (
    <div className={`game-feedback-reaction is-${type}`} role="status" aria-label={reactionLabels[type]}>
      <svg viewBox="0 0 220 150" aria-hidden="true">
        <defs>
          <pattern id="feedback-dots" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.6" fill="var(--feedback-dots)" />
          </pattern>
        </defs>
        <polygon className="game-feedback-reaction__back" points="110,9 125,37 151,18 151,49 187,37 166,65 207,76 171,92 198,118 160,113 161,146 132,126 111,154 92,126 59,145 64,112 25,118 52,91 13,77 52,65 27,38 67,49 69,17 96,39" />
        <polygon className="game-feedback-reaction__dots" points="110,18 124,42 148,27 147,54 178,44 160,68 195,77 164,91 187,112 155,108 156,136 131,119 111,143 94,120 66,136 70,108 37,112 59,90 26,78 59,68 38,45 72,54 74,27 97,44" />
        <polygon className="game-feedback-reaction__cloud" points="110,14 124,40 150,22 149,52 183,41 163,67 201,77 168,92 193,116 158,111 159,142 131,123 111,150 93,124 62,141 66,110 30,115 55,90 19,77 55,66 32,42 69,51 71,21 97,42" />
      </svg>
      <ReactionArtwork type={type} theme={theme} />
    </div>
  );
}
