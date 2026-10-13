import { useEffect, useMemo, useRef, useState } from "react";
import googleIcon from "../assets/branding/google-icon.webp";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import {
  ENTRY_CHALLENGE_QUESTIONS,
  createEntryChallenge,
  getEntryChallengeQuestion,
  isEntryChallengeAnswerCorrect,
} from "../domain/entryChallenge.js";
import {
  getLinkedSignInMethods,
  linkPasswordToCurrentAccount,
  registerWithEmailAndPassword,
  requestPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
} from "../services/firebaseAuth.js";
import { createCloudUserProfile } from "../services/cloudProfileRepository.js";
import {
  playBufferedSound,
  prepareSoundBuffers,
  stopBufferedSound,
  unlockSoundBuffers,
} from "../services/soundBuffer.js";
import {
  canPlayGameplaySounds,
  canPlayInterfaceSounds,
  getSoundScale,
} from "../services/userPreferences.js";
import {
  playButtonHoverSound,
  playButtonPressSound,
  playTypingSound,
} from "../services/uiSounds.js";
import { ProfileAvatar, PROFILE_AVATARS } from "./ProfileAvatar.jsx";
import SidebarMascot from "./SidebarMascot.jsx";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "Ese correo ya pertenece a una cuenta. Prueba iniciar sesión.",
  "auth/invalid-credential": "El correo o la contraseña no coinciden.",
  "auth/invalid-email": "Escribe una dirección de correo válida.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/network-request-failed": "No pudimos conectar con Firebase. Revisa tu conexión.",
  "auth/popup-closed-by-user": "La ventana de Google se cerró antes de terminar.",
  "auth/too-many-requests": "Hubo demasiados intentos. Espera un momento y vuelve a probar.",
  "auth/weak-password": "Usa una contraseña de al menos 6 caracteres.",
};

const DECORATIVE_QUESTIONS = [
  ...ENTRY_CHALLENGE_QUESTIONS.map(({ prompt }) => prompt),
  "¿Qué tema te gustaría dominar?",
  "¿Cuál fue el último dato que aprendiste?",
  "¿Qué pregunta nunca te cansas de responder?",
];

const ENTRY_QUESTION_SOUND = "/sounds/gameplay/next-question.mp3";
const CORRECT_ANSWER_SOUND = "/sounds/gameplay/correct-answer.mp3";
const WRONG_ANSWER_SOUND = "/sounds/gameplay/bad-answer.mp3";
const AUTH_INTERFACE_SOUND_PATHS = Object.freeze([
  "/sounds/button-hover.mp3",
  "/sounds/button-press.mp3",
  "/sounds/typing.wav",
]);
const AUTH_QWIZ_PARTICLES = Object.freeze(Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 37 + 5) % 96}%`,
  top: `${(index * 61 + 9) % 96}%`,
  size: `${30 + ((index * 17) % 28)}px`,
  delay: `${-((index * 0.83) % 9).toFixed(2)}s`,
  duration: `${(6.4 + ((index * 7) % 20) / 10).toFixed(1)}s`,
  rotation: `${-18 + ((index * 23) % 37)}deg`,
})));

const playEntryChallengeSound = (path, volume) => {
  if (!canPlayGameplaySounds()) return null;
  return playBufferedSound(path, { volume: Math.min(1, volume * getSoundScale()) });
};

const getErrorMessage = (error) => (
  AUTH_ERROR_MESSAGES[error?.code]
  ?? error?.message
  ?? "No pudimos completar la acción. Inténtalo nuevamente."
);

const shuffleOptions = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

function AuthQwizParticles() {
  return (
    <div className="auth-qwiz-particles" aria-hidden="true">
      {AUTH_QWIZ_PARTICLES.map((particle) => (
        <span
          className="auth-qwiz-particle"
          key={particle.id}
          style={{
            "--particle-left": particle.left,
            "--particle-top": particle.top,
            "--particle-size": particle.size,
            "--particle-delay": particle.delay,
            "--particle-duration": particle.duration,
            "--particle-rotation": particle.rotation,
          }}
        >
          <svg viewBox="0 0 96 84" role="presentation">
            <path
              className="auth-qwiz-particle__body"
              d="M48 82C19 82 8 62 9 37 10 16 18 3 28 3 38 3 42 18 44 33h8C54 18 58 3 68 3c10 0 18 13 19 34 1 25-10 45-39 45Z"
            />
            <g className="auth-qwiz-particle__eyes">
              <rect x="30" y="46" width="11" height="24" rx="5.5" />
              <rect x="55" y="46" width="11" height="24" rx="5.5" />
            </g>
          </svg>
        </span>
      ))}
    </div>
  );
}

const PasswordField = ({ id, label, value, onChange, autoComplete }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <span className="auth-field__control">
        <LockKeyhole size={17} aria-hidden="true" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={6}
          required
        />
        <button
          type="button"
          className="auth-field__reveal"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
};

function CredentialsPanel({ onUseAnotherAccount }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const run = async (operation) => {
    setPending(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const submitCredentials = (event) => {
    event.preventDefault();
    if (mode === "register" && password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    run(() => (
      mode === "login"
        ? signInWithEmailPassword(email, password)
        : registerWithEmailAndPassword(email, password)
    ));
  };

  const resetPassword = () => {
    if (!email.trim()) {
      setMessage("Escribe primero el correo de tu cuenta.");
      return;
    }
    run(async () => {
      await requestPasswordReset(email);
      setMessage("Si existe una cuenta con ese correo, recibirás las instrucciones.");
    });
  };

  return (
    <section className="auth-form-card" aria-labelledby="auth-title">
      <h1 id="auth-title">{mode === "login" ? "Vuelve al juego." : "Crea tu espacio."}</h1>
      <p>
        {mode === "login"
          ? "Entra para continuar con tus quizzes, resultados y amigos."
          : "Guarda tus quizzes y llévalos contigo a cualquier dispositivo."}
      </p>

      <div className="auth-tabs" role="tablist" aria-label="Acceso a MyQwiz">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "is-active" : ""}
          onClick={() => { setMode("login"); setMessage(""); }}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={mode === "register" ? "is-active" : ""}
          onClick={() => { setMode("register"); setMessage(""); }}
        >
          Registrarse
        </button>
      </div>

      <form className="auth-form" onSubmit={submitCredentials}>
        <label className="auth-field" htmlFor="auth-email">
          <span>Correo electrónico</span>
          <span className="auth-field__control">
            <Mail size={17} aria-hidden="true" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </span>
        </label>
        <PasswordField
          id="auth-password"
          label="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <PasswordField
            id="auth-confirmation"
            label="Repite la contraseña"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
          />
        )}

        {message && <p className="auth-message" role="status">{message}</p>}

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="is-spinning" size={18} /> : <ArrowRight size={18} />}
          {mode === "login" ? "Entrar" : "Crear mi cuenta"}
        </button>
      </form>

      {mode === "login" && (
        <button className="auth-forgot" type="button" onClick={resetPassword} disabled={pending}>
          Olvidé mi contraseña
        </button>
      )}

      <div className="auth-divider"><span>o continúa con</span></div>
      <button
        className="auth-google"
        type="button"
        disabled={pending}
        onClick={() => run(signInWithGoogle)}
      >
        <img src={googleIcon} alt="" aria-hidden="true" /> Google
      </button>
      {onUseAnotherAccount && (
        <button className="auth-forgot" type="button" onClick={onUseAnotherAccount}>
          Usar otra cuenta
        </button>
      )}
    </section>
  );
}

function OnboardingPanel({ user, onProfileCreated, onUseAnotherAccount }) {
  const needsPassword = !getLinkedSignInMethods(user).has("password");
  const [step, setStep] = useState("profile");
  const [username, setUsername] = useState(user?.displayName?.trim() ?? "");
  const [avatarId, setAvatarId] = useState(1);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [questionId, setQuestionId] = useState(ENTRY_CHALLENGE_QUESTIONS[0].id);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const continueToChallenge = (event) => {
    event.preventDefault();
    if (username.trim().length < 2) {
      setMessage("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (needsPassword && password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setMessage("");
    setStep("challenge");
  };

  const finishProfile = async (event) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const entryChallenge = createEntryChallenge(questionId, answer);
      if (needsPassword) await linkPasswordToCurrentAccount(password);
      const profile = await createCloudUserProfile(user, {
        username,
        avatarId,
        entryChallenge: { questionId, answer },
      });
      onProfileCreated({ profile, entryChallenge });
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="auth-form-card auth-form-card--onboarding" aria-labelledby="onboarding-title">
      <span className="auth-eyebrow">Perfil nuevo · {step === "profile" ? "1 de 2" : "2 de 2"}</span>
      <h1 id="onboarding-title">
        {step === "profile" ? "Hazlo tuyo." : "Crea tu pregunta sorpresa."}
      </h1>
      <p>
        {step === "profile"
          ? "Tu tag se generará automáticamente para que tus amigos puedan encontrarte."
          : "Escoge una pregunta y escribe la respuesta que reconocerás al entrar."}
      </p>

      {step === "profile" ? (
        <form className={`auth-form auth-form--profile ${needsPassword ? "has-password" : ""}`} onSubmit={continueToChallenge}>
          <div className="auth-profile-column">
            <label className="auth-field" htmlFor="profile-username">
              <span>Nombre de usuario</span>
              <span className="auth-field__control">
                <UserRound size={17} aria-hidden="true" />
                <input
                  id="profile-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="nickname"
                  minLength={2}
                  maxLength={32}
                  required
                />
              </span>
            </label>

            <fieldset className="auth-avatar-picker">
              <legend>Elige un icono</legend>
              <div>
                {PROFILE_AVATARS.map(({ id }) => (
                  <button
                    key={id}
                    type="button"
                    className={avatarId === id ? "is-active" : ""}
                    onClick={() => setAvatarId(id)}
                    aria-label={`Icono ${id}`}
                    aria-pressed={avatarId === id}
                  >
                    <ProfileAvatar avatarId={id} size={36} />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {needsPassword && (
            <div className="auth-profile-column auth-profile-column--password">
              <p className="auth-inline-note">Añade una contraseña para poder entrar también sin Google.</p>
              <PasswordField
                id="profile-password"
                label="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <PasswordField
                id="profile-confirmation"
                label="Repite la contraseña"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {message && <p className="auth-message" role="alert">{message}</p>}
          <button className="auth-submit" type="submit">
            <ArrowRight size={18} /> Continuar
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={finishProfile}>
          <fieldset className="auth-question-picker">
            <legend>Pregunta</legend>
            {ENTRY_CHALLENGE_QUESTIONS.map((question, index) => (
              <button
                key={question.id}
                type="button"
                className={questionId === question.id ? "is-active" : ""}
                onClick={() => setQuestionId(question.id)}
                aria-pressed={questionId === question.id}
              >
                <span>0{index + 1}</span>
                {question.prompt}
              </button>
            ))}
          </fieldset>
          <label className="auth-field" htmlFor="challenge-answer">
            <span>Tu respuesta correcta</span>
            <span className="auth-field__control">
              <Check size={17} aria-hidden="true" />
              <input
                id="challenge-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                maxLength={60}
                autoComplete="off"
                required
              />
            </span>
          </label>
          <p className="auth-inline-note">Las otras tres opciones quedarán fijas y el orden cambiará al entrar.</p>
          {message && <p className="auth-message" role="alert">{message}</p>}
          <div className="auth-form__actions">
            <button type="button" className="auth-back" onClick={() => setStep("profile")}>Atrás</button>
            <button className="auth-submit" type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="is-spinning" size={18} /> : <Check size={18} />}
              Terminar perfil
            </button>
          </div>
        </form>
      )}

      <button className="auth-forgot" type="button" onClick={onUseAnotherAccount} disabled={pending}>
        Usar otra cuenta
      </button>
    </section>
  );
}

function ChallengePanel({ profile, challenge, onPassed, onUseAnotherAccount }) {
  const question = getEntryChallengeQuestion(challenge?.questionId);
  const options = useMemo(
    () => shuffleOptions([challenge.answer, ...challenge.distractors]),
    [challenge],
  );
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("idle");
  const completionTimerRef = useRef(null);

  useEffect(() => {
    if (!canPlayGameplaySounds()) return undefined;
    prepareSoundBuffers([ENTRY_QUESTION_SOUND, CORRECT_ANSWER_SOUND, WRONG_ANSWER_SOUND]);
    const entrySound = playEntryChallengeSound(ENTRY_QUESTION_SOUND, 1);
    return () => stopBufferedSound(entrySound);
  }, []);

  useEffect(() => () => window.clearTimeout(completionTimerRef.current), []);

  const chooseAnswer = (option) => {
    if (status === "correct") return;
    setSelected(option);
    if (isEntryChallengeAnswerCorrect(challenge, option)) {
      playEntryChallengeSound(CORRECT_ANSWER_SOUND, 0.58);
      setStatus("correct");
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = window.setTimeout(onPassed, 720);
    } else {
      playEntryChallengeSound(WRONG_ANSWER_SOUND, 0.58);
      setStatus("wrong");
    }
  };

  return (
    <section className={`auth-form-card auth-form-card--challenge is-${status}`} aria-labelledby="challenge-title">
      <span className="auth-eyebrow">Pregunta sorpresa</span>
      <div className="auth-challenge-user">
        <ProfileAvatar avatarId={profile.avatarId} size={46} />
        <span><strong>{profile.username}</strong><small>#{profile.tag}</small></span>
      </div>
      <p className="auth-challenge-kicker">Una última pregunta</p>
      <h1 className="auth-challenge-question" id="challenge-title">{question?.prompt}</h1>

      <div className="auth-answer-grid" role="group" aria-label="Respuestas posibles">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={selected === option ? "is-selected" : ""}
            data-button-sound="gameplay"
            onClick={() => chooseAnswer(option)}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            {option}
          </button>
        ))}
      </div>

      <p className="auth-challenge-feedback" aria-live="polite">
        {status === "wrong" && "Esa no era. Prueba otra opción."}
        {status === "correct" && "¡Correcto! Preparando tu espacio…"}
      </p>
      <button className="auth-forgot" type="button" onClick={onUseAnotherAccount}>
        Usar otra cuenta
      </button>
    </section>
  );
}

export default function AuthPortal({
  stage,
  user,
  profile,
  challenge,
  wordmark,
  onProfileCreated,
  onChallengePassed,
  onUseAnotherAccount,
}) {
  useEffect(() => {
    document.body.classList.add("is-auth-screen");
    return () => document.body.classList.remove("is-auth-screen");
  }, []);

  useEffect(() => {
    if (canPlayInterfaceSounds()) prepareSoundBuffers(AUTH_INTERFACE_SOUND_PATHS);

    const unlockAudio = () => {
      if (canPlayInterfaceSounds()) unlockSoundBuffers(AUTH_INTERFACE_SOUND_PATHS);
    };
    const playHoverSound = (event) => {
      if (event.pointerType === "touch" || !(event.target instanceof Element)) return;
      const button = event.target.closest(".auth-portal button");
      if (
        !button
        || button.disabled
        || !canPlayInterfaceSounds()
        || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))
      ) return;
      playButtonHoverSound();
    };
    const playPressSound = (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest(".auth-portal button");
      if (!button || button.disabled) return;
      if (button.dataset.buttonSound === "gameplay" && canPlayGameplaySounds()) return;
      playButtonPressSound();
    };
    const textInputTypes = new Set(["text", "search", "email", "url", "tel", "number", "password"]);
    const playFieldTypingSound = (event) => {
      const target = event.target;
      const isAuthField = target instanceof Element && target.closest(".auth-portal");
      const isTextInput = target instanceof HTMLInputElement && textInputTypes.has(target.type);
      const isEditable = isTextInput || target instanceof HTMLTextAreaElement;
      const inputType = event.inputType ?? "";
      if (
        !isAuthField
        || !isEditable
        || (!inputType.startsWith("insert") && !inputType.startsWith("delete"))
      ) return;
      playTypingSound();
    };

    window.addEventListener("pointerdown", unlockAudio, { capture: true });
    window.addEventListener("keydown", unlockAudio, { capture: true });
    document.addEventListener("pointerover", playHoverSound);
    document.addEventListener("click", playPressSound);
    document.addEventListener("beforeinput", playFieldTypingSound);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio, { capture: true });
      window.removeEventListener("keydown", unlockAudio, { capture: true });
      document.removeEventListener("pointerover", playHoverSound);
      document.removeEventListener("click", playPressSound);
      document.removeEventListener("beforeinput", playFieldTypingSound);
    };
  }, []);

  return (
    <main className={`auth-portal auth-portal--${stage}`}>
      <AuthQwizParticles />
      <header className="auth-brand">
        <SidebarMascot />
        <img src={wordmark} alt="MyQwiz" />
      </header>

      <div className="auth-portal__layout">
        <div className="auth-portal__panel">
          {stage === "loading" && (
            <section className="auth-form-card auth-form-card--loading" aria-live="polite">
              <LoaderCircle className="is-spinning" size={30} />
              <strong>Preparando MyQwiz…</strong>
            </section>
          )}
          {stage === "credentials" && <CredentialsPanel />}
          {stage === "onboarding" && (
            <OnboardingPanel
              user={user}
              onProfileCreated={onProfileCreated}
              onUseAnotherAccount={onUseAnotherAccount}
            />
          )}
          {stage === "challenge" && challenge && (
            <ChallengePanel
              profile={profile}
              challenge={challenge}
              onPassed={onChallengePassed}
              onUseAnotherAccount={onUseAnotherAccount}
            />
          )}
        </div>

        <section className="auth-portal__visual" aria-hidden="true">
          <div className="auth-orbit">
            {DECORATIVE_QUESTIONS.map((question, index) => (
              <article
                className="auth-orbit__card"
                style={{
                  "--orbit-angle": `${index * 60}deg`,
                  "--orbit-counter-angle": `${index * -60}deg`,
                }}
                key={question}
              >
                <div>
                  <strong>{question}</strong>
                </div>
              </article>
            ))}
            <div className="auth-orbit__center">?</div>
          </div>
        </section>
      </div>
    </main>
  );
}
