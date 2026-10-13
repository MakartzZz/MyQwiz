import { Check, Inbox, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";
import { ProfileAvatar } from "./ProfileAvatar.jsx";
import { QuizIcon } from "./QuizIcon.jsx";

function QuizInboxModal({ invitations, onAccept, onClose, onDecline }) {
  const [activeInvitationId, setActiveInvitationId] = useState(null);
  const [message, setMessage] = useState("");
  useModalOpenSound(true);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key === "Escape" && !activeInvitationId) onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [activeInvitationId, onClose]);

  const respond = async (invitation, response) => {
    setActiveInvitationId(invitation.id);
    setMessage("");
    try {
      if (response === "accept") await onAccept(invitation.id);
      else await onDecline(invitation.id);
    } catch (error) {
      setMessage(error?.message ?? "No pudimos responder la invitación.");
    } finally {
      setActiveInvitationId(null);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={activeInvitationId ? undefined : onClose}>
      <section className="quiz-modal quiz-inbox-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-inbox-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Quizzes compartidos</span>
            <h2 id="quiz-inbox-title">Bandeja de entrada</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={Boolean(activeInvitationId)} aria-label="Cerrar">×</button>
        </div>

        {invitations.length ? (
          <div className="quiz-inbox-list">
            {invitations.map((invitation) => {
              const isActive = activeInvitationId === invitation.id;
              return (
                <article className="quiz-inbox-item" key={invitation.id}>
                  <span className="quiz-inbox-item__icon"><QuizIcon iconId={invitation.iconId} size={25} /></span>
                  <div className="quiz-inbox-item__copy">
                    <strong>{invitation.title}</strong>
                    <span className="quiz-inbox-item__owner">
                      <ProfileAvatar avatarId={invitation.ownerProfile?.avatarId ?? 1} size={25} />
                      De {invitation.ownerProfile?.username ?? "un usuario de MyQwiz"}
                    </span>
                    <small>{invitation.questionCount} {invitation.questionCount === 1 ? "pregunta" : "preguntas"}</small>
                  </div>
                  <div className="quiz-inbox-item__actions">
                    <button className="is-accept" type="button" onClick={() => respond(invitation, "accept")} disabled={Boolean(activeInvitationId)}>
                      {isActive ? <LoaderCircle className="is-spinning" size={16} /> : <Check size={16} />}
                      Aceptar
                    </button>
                    <button className="is-decline" type="button" onClick={() => respond(invitation, "decline")} disabled={Boolean(activeInvitationId)}>
                      <X size={16} /> Rechazar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="quiz-inbox-empty">
            <Inbox size={30} />
            <strong>Todo al día</strong>
            <span>No tienes quizzes pendientes por revisar.</span>
          </div>
        )}

        {message && <p className="profile-modal__message" role="alert">{message}</p>}
      </section>
    </div>
  );
}

export default QuizInboxModal;
