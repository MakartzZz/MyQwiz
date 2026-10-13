import { useEffect, useState } from "react";
import { Check, LoaderCircle, Send } from "lucide-react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";
import { getFriendships } from "../services/cloudFriendRepository.js";
import { listQuizShareStatuses } from "../services/cloudQuizRepository.js";
import { ProfileAvatar } from "./ProfileAvatar.jsx";

function QuizExportModal({ quiz, userId, onClose, onExport, onShare }) {
  const [friends, setFriends] = useState([]);
  const [shareStatuses, setShareStatuses] = useState({});
  const [selectedFriendIds, setSelectedFriendIds] = useState(() => new Set());
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  useModalOpenSound(Boolean(quiz));

  useEffect(() => {
    if (!quiz || !userId) return undefined;
    let active = true;
    setFriends([]);
    setShareStatuses({});
    setSelectedFriendIds(new Set());
    setLoadingFriends(true);
    setMessage("");

    Promise.all([
      getFriendships(userId),
      listQuizShareStatuses(quiz.id, userId),
    ])
      .then(([currentFriends, currentShareStatuses]) => {
        if (active) {
          setFriends(currentFriends);
          setShareStatuses(currentShareStatuses);
        }
      })
      .catch(() => {
        if (active) setMessage("No pudimos cargar tus amistades. Inténtalo nuevamente.");
      })
      .finally(() => {
        if (active) setLoadingFriends(false);
      });

    return () => { active = false; };
  }, [quiz, userId]);

  useEffect(() => {
    if (!quiz) return undefined;
    const closeWithEscape = (event) => {
      if (event.key === "Escape" && !sharing) onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [quiz, onClose, sharing]);

  if (!quiz) return null;

  const toggleFriend = (friendshipId) => {
    setSelectedFriendIds((current) => {
      const next = new Set(current);
      if (next.has(friendshipId)) next.delete(friendshipId);
      else next.add(friendshipId);
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    const selectedFriends = friends.filter(({ id }) => selectedFriendIds.has(id));
    if (selectedFriends.length === 0) return;

    setSharing(true);
    setMessage("");
    try {
      await onShare(selectedFriends);
    } catch (error) {
      setMessage(error?.message ?? "No pudimos compartir el quiz.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={sharing ? undefined : onClose}>
      <section className="quiz-modal quiz-export-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-export-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Compartir quiz</span>
            <h2 id="quiz-export-title">Elige a tus amigos</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={sharing} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submit}>
          <div className="quiz-share-summary">
            <strong>{quiz.title}</strong>
            <span>{quiz.questions.length} {quiz.questions.length === 1 ? "pregunta" : "preguntas"}</span>
          </div>

          <div className="quiz-share-friends" aria-label="Amigos disponibles">
            {loadingFriends && (
              <div className="quiz-share-friends__state">
                <LoaderCircle className="is-spinning" size={24} />
                <span>Cargando amistades…</span>
              </div>
            )}
            {!loadingFriends && friends.length === 0 && (
              <div className="quiz-share-friends__state">
                <strong>Aún no tienes amigos agregados</strong>
                <span>Puedes agregarlos desde tu perfil.</span>
              </div>
            )}
            {friends.map((friendship) => {
              const selected = selectedFriendIds.has(friendship.id);
              const recipientId = friendship.friend?.uid;
              const existingStatus = recipientId ? shareStatuses[recipientId] : null;
              const unavailable = Boolean(existingStatus);
              return (
                <label className={`${selected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`} key={friendship.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={unavailable}
                    onChange={() => toggleFriend(friendship.id)}
                  />
                  <ProfileAvatar avatarId={friendship.friend?.avatarId ?? 1} size={40} />
                  <span>
                    <strong>{friendship.friend?.username ?? "Usuario de MyQwiz"}</strong>
                    <small>
                      {existingStatus === "accepted"
                        ? "Ya tiene este quiz"
                        : existingStatus === "pending"
                          ? "Invitación pendiente"
                          : friendship.friend?.tag
                            ? `#${friendship.friend.tag}`
                            : "Amistad de MyQwiz"}
                    </small>
                  </span>
                  <i aria-hidden="true">{unavailable ? "—" : <Check size={15} />}</i>
                </label>
              );
            })}
          </div>

          {message && <p className="profile-modal__message" role="alert">{message}</p>}

          <div className="quiz-modal__actions quiz-export-modal__actions">
            <button className="secondary-button" type="submit" disabled={sharing || selectedFriendIds.size === 0}>
              {sharing ? <LoaderCircle className="is-spinning" size={17} /> : <Send size={17} />}
              Enviar{selectedFriendIds.size > 1 ? ` a ${selectedFriendIds.size}` : ""}
            </button>
            <button className="quiz-export-modal__json" type="button" onClick={() => onExport(quiz.title)} disabled={sharing}>
              JSON
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizExportModal;
