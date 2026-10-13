import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, LoaderCircle, Save, Send, Trash2, UsersRound, X } from "lucide-react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendships,
  getPendingFriendRequests,
  removeFriendship,
  sendFriendRequest,
} from "../services/cloudFriendRepository.js";
import {
  findProfileByUsernameAndTag,
  updateCloudUserProfile,
} from "../services/cloudProfileRepository.js";
import { ProfileAvatar, PROFILE_AVATARS } from "./ProfileAvatar.jsx";

export default function ProfileModal({ account, onClose, onProfileUpdated }) {
  const { user, profile } = account;
  const [username, setUsername] = useState(profile.username);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState(null);
  const [removingFriendshipId, setRemovingFriendshipId] = useState(null);
  const [friendCode, setFriendCode] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [requestsMessage, setRequestsMessage] = useState("");
  const [friendsMessage, setFriendsMessage] = useState("");
  const [sharingMessage, setSharingMessage] = useState("");
  useModalOpenSound(true);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key !== "Escape") return;
      if (requestsOpen) setRequestsOpen(false);
      else if (avatarPickerOpen) setAvatarPickerOpen(false);
      else onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [avatarPickerOpen, onClose, requestsOpen]);

  useEffect(() => {
    let active = true;
    getPendingFriendRequests(user.uid)
      .then((pendingRequests) => {
        if (active) setRequests(pendingRequests);
      })
      .catch(() => {
        if (active) setRequestsMessage("No pudimos cargar las solicitudes. Inténtalo nuevamente.");
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    let active = true;
    getFriendships(user.uid)
      .then((currentFriends) => {
        if (active) setFriends(currentFriends);
      })
      .catch(() => {
        if (active) setFriendsMessage("No pudimos cargar tus amistades. Inténtalo nuevamente.");
      })
      .finally(() => {
        if (active) setLoadingFriends(false);
      });
    return () => { active = false; };
  }, [user.uid]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    try {
      const updatedProfile = await updateCloudUserProfile(user.uid, profile.tag, { username, avatarId });
      onProfileUpdated(updatedProfile);
      setProfileMessage("Perfil actualizado.");
    } catch (error) {
      setProfileMessage(error?.message ?? "No pudimos actualizar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const answerRequest = async (friendRequest, response) => {
    setRespondingRequestId(friendRequest.id);
    setRequestsMessage("");
    try {
      if (response === "accepted") {
        const friendship = await acceptFriendRequest(friendRequest.id, user.uid);
        setFriends((current) => [
          { ...friendship, friend: friendRequest.sender },
          ...current.filter(({ id }) => id !== friendship.id),
        ]);
      } else {
        await declineFriendRequest(friendRequest.id, user.uid);
      }
      setRequests((current) => current.filter(({ id }) => id !== friendRequest.id));
      setRequestsMessage(response === "accepted" ? "Solicitud aceptada." : "Solicitud rechazada.");
    } catch (error) {
      setRequestsMessage(error?.message ?? "No pudimos responder la solicitud.");
    } finally {
      setRespondingRequestId(null);
    }
  };

  const deleteFriend = async (friendship) => {
    setRemovingFriendshipId(friendship.id);
    setFriendsMessage("");
    try {
      await removeFriendship(friendship.id, user.uid);
      setFriends((current) => current.filter(({ id }) => id !== friendship.id));
      setFriendsMessage("Amistad eliminada.");
    } catch (error) {
      setFriendsMessage(error?.message ?? "No pudimos eliminar la amistad.");
    } finally {
      setRemovingFriendshipId(null);
    }
  };

  const copyFriendCode = async () => {
    const value = `${profile.username}#${profile.tag}`;
    setSharingMessage("");
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("No se pudo copiar.");
      }
      setSharingMessage("Identificador copiado.");
    } catch {
      setSharingMessage("No se pudo copiar. Puedes seleccionarlo manualmente.");
    }
  };

  const addFriend = async (event) => {
    event.preventDefault();
    const separatorIndex = friendCode.lastIndexOf("#");
    const searchedUsername = friendCode.slice(0, separatorIndex).trim();
    const searchedTag = friendCode.slice(separatorIndex + 1).trim();

    if (separatorIndex < 1 || !/^[2-9A-HJ-NP-Z]{6}$/i.test(searchedTag)) {
      setSharingMessage("Escribe el identificador completo, por ejemplo Ana#ABC234.");
      return;
    }

    setSendingRequest(true);
    setSharingMessage("");
    try {
      const recipient = await findProfileByUsernameAndTag(searchedUsername, searchedTag);
      if (!recipient) throw new Error("No encontramos un perfil con ese identificador.");
      if (requests.some(({ senderId }) => senderId === recipient.uid)) {
        throw new Error("Esta persona ya te envió una solicitud. Puedes aceptarla abajo.");
      }
      await sendFriendRequest(user.uid, recipient);
      setFriendCode("");
      setSharingMessage(`Solicitud enviada a ${recipient.username}.`);
    } catch (error) {
      setSharingMessage(error?.message ?? "No pudimos enviar la solicitud.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="quiz-modal profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Tu cuenta</span>
            <h2 id="profile-modal-title">Perfil y amistades</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="profile-modal__layout">
          <form className="profile-modal__editor" onSubmit={saveProfile}>
            <div className="profile-modal__identity">
              <ProfileAvatar avatarId={avatarId} size={70} />
              <span>
                <strong>{username.trim() || profile.username}</strong>
                <span className="profile-modal__tag">
                  <small>#{profile.tag}</small>
                  <button type="button" onClick={copyFriendCode} aria-label="Copiar mi identificador" title="Copiar identificador">
                    <Copy size={14} />
                  </button>
                </span>
              </span>
            </div>

            <div className="profile-modal__facts">
              <span><small>Correo</small><strong>{user.email}</strong></span>
            </div>

            <div className="profile-modal__customization">
              <label className="form-field">
                <span>Nombre de usuario</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={2}
                  maxLength={32}
                  required
                />
              </label>

              <fieldset className={`profile-avatar-picker ${avatarPickerOpen ? "is-open" : ""}`}>
                <legend>
                  <span className="profile-avatar-picker__label-full">Icono de perfil</span>
                  <span className="profile-avatar-picker__label-short">Icono</span>
                </legend>
                <button
                  className="profile-avatar-picker__toggle"
                  type="button"
                  onClick={() => setAvatarPickerOpen((current) => !current)}
                  aria-controls="profile-avatar-options"
                  aria-expanded={avatarPickerOpen}
                  aria-label="Cambiar icono de perfil"
                >
                  <ProfileAvatar avatarId={avatarId} size={32} />
                  <ChevronDown size={14} />
                </button>
                <div id="profile-avatar-options">
                  {PROFILE_AVATARS.map(({ id }) => (
                    <button
                      key={id}
                      type="button"
                      className={avatarId === id ? "is-active" : ""}
                      onClick={() => {
                        setAvatarId(id);
                        setAvatarPickerOpen(false);
                      }}
                      aria-label={`Icono ${id}`}
                      aria-pressed={avatarId === id}
                    >
                      <ProfileAvatar avatarId={id} size={34} />
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            {profileMessage && <p className="profile-modal__message" aria-live="polite">{profileMessage}</p>}
            <button className="secondary-button profile-modal__save" type="submit" disabled={savingProfile}>
              {savingProfile ? <LoaderCircle className="is-spinning" size={17} /> : <Save size={17} />}
              Guardar cambios
            </button>
          </form>

          <section className="profile-modal__requests" aria-labelledby="friend-requests-title">
            <div className="profile-friend-tools">
              <form className="profile-friend-add" onSubmit={addFriend}>
                <label htmlFor="friend-code">Agregar una amistad</label>
                <div className="profile-friend-add__row">
                  <input
                    id="friend-code"
                    value={friendCode}
                    onChange={(event) => setFriendCode(event.target.value)}
                    placeholder="Nombre#TAG"
                    maxLength={40}
                    autoComplete="off"
                    required
                  />
                  <button type="submit" disabled={sendingRequest} aria-label="Enviar solicitud">
                    {sendingRequest ? <LoaderCircle className="is-spinning" size={17} /> : <Send size={17} />}
                  </button>
                  <span className="profile-request-toggle-wrap">
                    <button
                      className={`profile-request-toggle ${requestsOpen ? "is-open" : ""}`}
                      type="button"
                      onClick={() => setRequestsOpen((current) => !current)}
                      aria-controls="profile-request-options"
                      aria-expanded={requestsOpen}
                      aria-label={`Mostrar solicitudes pendientes: ${requests.length}`}
                      title="Solicitudes pendientes"
                    >
                      <UsersRound size={16} />
                    </button>
                    {!loadingRequests && <b aria-hidden="true">{requests.length}</b>}
                  </span>
                </div>
              </form>

              <div
                id="profile-request-options"
                className={`profile-request-popover ${requestsOpen ? "is-open" : ""}`}
              >
                <div className="profile-request-popover__heading">
                  <strong>Solicitudes pendientes</strong>
                  {!loadingRequests && <span>{requests.length}</span>}
                </div>
                <div className="profile-request-list">
                  {loadingRequests && (
                    <div className="profile-request-list__state">
                      <LoaderCircle className="is-spinning" size={22} />
                      <span>Cargando solicitudes…</span>
                    </div>
                  )}
                  {!loadingRequests && requests.length === 0 && (
                    <div className="profile-request-list__state">
                      <strong>Todo al día</strong>
                      <span>No tienes solicitudes pendientes.</span>
                    </div>
                  )}
                  {requests.map((friendRequest) => (
                    <article className="profile-request" key={friendRequest.id}>
                      <ProfileAvatar avatarId={friendRequest.sender?.avatarId ?? 1} size={42} />
                      <span>
                        <strong>{friendRequest.sender?.username ?? "Usuario de MyQwiz"}</strong>
                        <small>{friendRequest.sender?.tag ? `#${friendRequest.sender.tag}` : "Solicitud de amistad"}</small>
                      </span>
                      <div>
                        <button
                          type="button"
                          className="profile-request__accept"
                          disabled={respondingRequestId === friendRequest.id}
                          onClick={() => answerRequest(friendRequest, "accepted")}
                          aria-label="Aceptar solicitud"
                          title="Aceptar"
                        >
                          <Check size={17} />
                        </button>
                        <button
                          type="button"
                          className="profile-request__decline"
                          disabled={respondingRequestId === friendRequest.id}
                          onClick={() => answerRequest(friendRequest, "declined")}
                          aria-label="Rechazar solicitud"
                          title="Rechazar"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {requestsMessage && <p className="profile-modal__message" aria-live="polite">{requestsMessage}</p>}
              </div>
              {sharingMessage && <p className="profile-modal__message" aria-live="polite">{sharingMessage}</p>}
            </div>

            <div className="profile-modal__section-heading">
              <span>
                <small>Amistades</small>
                <strong id="friend-requests-title">Amigos agregados</strong>
              </span>
              {!loadingFriends && <b>{friends.length}</b>}
            </div>

            <div className="profile-request-list profile-friend-list">
              {loadingFriends && (
                <div className="profile-request-list__state">
                  <LoaderCircle className="is-spinning" size={22} />
                  <span>Cargando amistades…</span>
                </div>
              )}
              {!loadingFriends && friends.length === 0 && (
                <div className="profile-request-list__state">
                  <strong>Tu lista está vacía</strong>
                  <span>Agrega amistades usando su nombre y TAG.</span>
                </div>
              )}
              {friends.map((friendship) => (
                <article className="profile-request profile-friend" key={friendship.id}>
                  <ProfileAvatar avatarId={friendship.friend?.avatarId ?? 1} size={42} />
                  <span>
                    <strong>{friendship.friend?.username ?? "Usuario de MyQwiz"}</strong>
                    <small>{friendship.friend?.tag ? `#${friendship.friend.tag}` : "Amistad de MyQwiz"}</small>
                  </span>
                  <div>
                    <button
                      type="button"
                      className="profile-friend__remove"
                      disabled={removingFriendshipId === friendship.id}
                      onClick={() => deleteFriend(friendship)}
                      aria-label={`Eliminar a ${friendship.friend?.username ?? "esta amistad"}`}
                      title="Eliminar amistad"
                    >
                      {removingFriendshipId === friendship.id
                        ? <LoaderCircle className="is-spinning" size={17} />
                        : <Trash2 size={16} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {friendsMessage && <p className="profile-modal__message" aria-live="polite">{friendsMessage}</p>}
          </section>
        </div>
      </section>
    </div>
  );
}
