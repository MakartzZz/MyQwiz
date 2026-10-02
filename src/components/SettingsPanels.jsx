import {
  Accessibility,
  BellRing,
  BookOpen,
  Cat,
  Eye,
  FileJson,
  Gamepad2,
  MousePointer2,
  Play,
  Sparkles,
  Type,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { playConfirmSound } from "../services/uiSounds.js";

const SettingSwitch = ({ checked, description, icon: SettingIcon, label, onChange }) => (
  <label className={`preference-switch ${checked ? "is-active" : ""}`}>
    <span className="preference-switch__icon"><SettingIcon size={22} /></span>
    <span><strong>{label}</strong><small>{description}</small></span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <i aria-hidden="true"><b /></i>
  </label>
);

export function SoundSettings({ preferences, onChange }) {
  const levels = ["Suave", "Medio", "Alto"];

  return (
    <section className="preference-page" aria-labelledby="sound-settings-title">
      <div className="preference-page__heading">
        <span className="preference-page__mark"><Volume2 size={28} /></span>
        <div><span className="eyebrow">Sonido</span><h2 id="sound-settings-title">Escucha la interfaz a tu manera.</h2><p>Controla los efectos sin alterar el volumen independiente de la música ambiental.</p></div>
      </div>

      <div className="preference-grid">
        <SettingSwitch checked={preferences.interfaceSounds} icon={MousePointer2} label="Sonidos de interfaz" description="Hover, confirmaciones, modales y notificaciones." onChange={(value) => onChange({ interfaceSounds: value })} />
        <SettingSwitch checked={preferences.typingSounds} icon={Type} label="Sonido al escribir" description="Activa o silencia solamente las pulsaciones dentro de campos de texto." onChange={(value) => onChange({ typingSounds: value })} />
        <SettingSwitch checked={preferences.gameplaySounds} icon={Gamepad2} label="Sonidos del juego" description="Respuestas, tiempo, vidas y cambio de pregunta." onChange={(value) => onChange({ gameplaySounds: value })} />
        <SettingSwitch checked={preferences.catRewardSounds} icon={Cat} label="Maullido de recompensa" description="Silencia el maullido que suena al ganar una comida para Qwiz." onChange={(value) => onChange({ catRewardSounds: value })} />
        <article className="preference-level">
          <div><span className="preference-switch__icon"><BellRing size={22} /></span><span><strong>Intensidad de efectos</strong><small>Se aplica a todos los sonidos activados.</small></span></div>
          <div className="preference-level__options">
            {levels.map((level, index) => <button className={preferences.soundLevel === index ? "is-active" : ""} type="button" key={level} onClick={() => onChange({ soundLevel: index })}>{level}</button>)}
          </div>
        </article>
      </div>

      <button className="preference-test" type="button" data-button-sound="interface" disabled={!preferences.interfaceSounds} onClick={playConfirmSound}><Play size={16} fill="currentColor" /> Probar sonido</button>
    </section>
  );
}

export function HelpSettings({ onCreate, onImport, onPromptRoom }) {
  const actions = [
    { icon: WandSparkles, eyebrow: "Desde cero", title: "Crear un quiz", text: "Construye preguntas y define su materia.", action: onCreate },
    { icon: FileJson, eyebrow: "JSON", title: "Importar contenido", text: "Sube un archivo o pega el texto generado.", action: onImport },
    { icon: Sparkles, eyebrow: "Asistencia", title: "Usar la sala de prompts", text: "Prepara instrucciones claras para cualquier IA.", action: onPromptRoom },
  ];

  return (
    <section className="preference-page help-page" aria-labelledby="help-settings-title">
      <div className="preference-page__heading">
        <span className="preference-page__mark"><BookOpen size={28} /></span>
        <div><span className="eyebrow">Ayuda</span><h2 id="help-settings-title">¿Qué quieres hacer?</h2><p>Accesos rápidos y respuestas para las tareas más importantes de MyQwiz.</p></div>
      </div>

      <div className="help-actions">
        {actions.map(({ icon: ActionIcon, eyebrow, title, text, action }) => (
          <button type="button" onClick={action} key={title}>
            <span><ActionIcon size={24} /></span><small>{eyebrow}</small><strong>{title}</strong><p>{text}</p><i>Ir ahora →</i>
          </button>
        ))}
      </div>

      <div className="help-faq">
        <span className="eyebrow">Preguntas frecuentes</span>
        <details><summary>¿Dónde se guardan mis quizzes?</summary><p>Se guardan en el almacenamiento local de este navegador. Exporta los importantes para conservar una copia o moverlos a otro dispositivo.</p></details>
        <details><summary>¿Cómo se registra mi mejor nota?</summary><p>Cada vez que completas un quiz, MyQwiz compara el resultado y conserva automáticamente la puntuación más alta.</p></details>
        <details className="help-controls">
          <summary>¿Cómo puedo jugar usando el teclado?</summary>
          <div className="help-controls__content">
            <p>Estos controles funcionan en Clásico, Vidas, Punto de control y Carrera.</p>
            <div><strong>Selección múltiple</strong><span><kbd>WASD</kbd> o las flechas mueven el foco. El primer <kbd>Enter</kbd> selecciona y el segundo confirma.</span></div>
            <div><strong>Verdadero o falso</strong><span><kbd>A</kbd>/<kbd>D</kbd> o las flechas cambian de opción. Usa dos veces <kbd>Enter</kbd> para seleccionar y confirmar.</span></div>
            <div><strong>Asociar</strong><span><kbd>W</kbd>/<kbd>S</kbd> o arriba/abajo recorren cada columna. <kbd>Enter</kbd> elige el elemento y luego su pareja; <kbd>Espacio</kbd> confirma al completar todas.</span></div>
            <div><strong>Completar</strong><span>Escribe la respuesta y utiliza <kbd>Enter</kbd> para comprobarla.</span></div>
            <div><strong>Navegación general</strong><span><kbd>Tab</kbd> y <kbd>Shift</kbd> + <kbd>Tab</kbd> recorren los demás botones y controles.</span></div>
          </div>
        </details>
        <details className="help-controls">
          <summary>¿Puedo agregar MyQwiz al escritorio o a la pantalla de inicio?</summary>
          <div className="help-controls__content">
            <p>Sí. Al instalar MyQwiz desde el navegador se abre como una aplicación independiente, con una interfaz más limpia y más espacio para jugar.</p>
            <div><strong>En móviles</strong><span>Abre el menú del navegador y elige <b>Instalar aplicación</b> o <b>Agregar a pantalla de inicio</b>. Al abrirla desde su icono, las barras y controles del navegador dejan de ocupar espacio.</span></div>
            <div><strong>En computadora</strong><span>Busca la opción <b>Instalar MyQwiz</b> en la barra de direcciones o en el menú del navegador. Tendrás un acceso directo y una ventana propia para la app.</span></div>
            <div><strong>Si no aparece</strong><span>El nombre de la opción puede variar según el navegador. Prueba desde Chrome, Edge o Safari y revisa su menú principal.</span></div>
          </div>
        </details>
        <details><summary>¿Puedo importar contenido creado por una IA?</summary><p>Sí. Puedes descargar el JSON o copiarlo completo y pegarlo directamente en la ventana de importación.</p></details>
      </div>
    </section>
  );
}

export function AccessibilitySettings({ preferences, onChange }) {
  return (
    <section className="preference-page" aria-labelledby="accessibility-settings-title">
      <div className="preference-page__heading">
        <span className="preference-page__mark"><Accessibility size={28} /></span>
        <div><span className="eyebrow">Accesibilidad</span><h2 id="accessibility-settings-title">Una experiencia más cómoda.</h2><p>Los cambios se aplican de inmediato y permanecen guardados en este navegador.</p></div>
      </div>

      <div className="preference-grid preference-grid--accessibility">
        <SettingSwitch checked={preferences.largeText} icon={Type} label="Texto ampliado" description="Aumenta el tamaño general del contenido y los controles." onChange={(value) => onChange({ largeText: value })} />
        <SettingSwitch checked={preferences.highContrast} icon={Eye} label="Contraste reforzado" description="Distingue mejor bordes, controles y elementos enfocados." onChange={(value) => onChange({ highContrast: value })} />
        <SettingSwitch checked={preferences.reduceMotion} icon={Sparkles} label="Reducir movimiento" description="Detiene giros, cintas, brillos y transiciones decorativas." onChange={(value) => onChange({ reduceMotion: value })} />
      </div>
    </section>
  );
}
