import { useState } from "react";
import { themes } from "../config/themes.js";

const studyIconPaths = {
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.3 2.1c-.8.4-1.1.9-1.1 1.9" /><path d="M12 17h.01" /></>,
  bulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8.5 14.5a6 6 0 1 1 7 0c-.9.7-1.5 1.7-1.5 2.5h-4c0-.8-.6-1.8-1.5-2.5Z" /></>,
  pencil: <><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16Z" /><path d="m14.5 6.7 3 3" /></>,
  page: <><path d="M6 2h8l4 4v16H6Z" /><path d="M14 2v5h5" /><path d="M9 12h6" /><path d="M9 16h6" /></>,
  book: <><path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v18H6.5A3.5 3.5 0 0 0 3 23Z" /><path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v18h4.5A3.5 3.5 0 0 1 21 23Z" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.7L16.5 9" /></>,
};

const StudyIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {studyIconPaths[name]}
  </svg>
);

const ribbonIcons = [
  "question", "bulb", "pencil", "page", "book", "check",
  "bulb", "question", "page", "pencil", "book", "check",
  "pencil", "bulb", "question", "book", "page", "check",
];

const ThemeRibbons = () => (
  <div className="theme-ribbons" aria-hidden="true">
    <div className="theme-backdrop-copy">
      <span>ELIGE</span>
      <span>TU MUNDO</span>
      <strong>MYQWIZ</strong>
      <small>ESTUDIA · CREA · JUEGA</small>
    </div>
    {["one", "two", "three"].map((ribbon, ribbonIndex) => (
      <div className={`theme-ribbon theme-ribbon--${ribbon}`} style={{ "--ribbon-pop-index": ribbonIndex }} key={ribbon}>
        <div className="theme-ribbon__track">
          {[0, 1].map((group) => (
            <span className="theme-ribbon__group" key={group}>
              {ribbonIcons.map((icon, index) => (
                <span className="theme-ribbon__icon" style={{ "--icon-pop-index": ribbonIndex * 2 + group * ribbonIcons.length + index }} key={`${icon}-${index}`}>
                  <StudyIcon name={icon} />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

function ThemeSwitcher({ activeTheme, onChange }) {
  const [spinningTheme, setSpinningTheme] = useState(null);

  const selectTheme = (themeId, event) => {
    setSpinningTheme(themeId);
    onChange(themeId, event.currentTarget);
  };

  return (
    <>
      <ThemeRibbons key={activeTheme} />
      <section className="theme-studio" aria-labelledby="theme-studio-title">

      <div className="theme-studio__heading">
        <span className="eyebrow">Apariencia</span>
        <h2 id="theme-studio-title">Elige tu mundo</h2>
        <p>Cada personaje transforma los colores y el ambiente de MyQwiz.</p>
      </div>

      <div className="theme-gallery">
        {themes.map((theme, index) => (
          <button
            className={`theme-card ${activeTheme === theme.id ? "is-active" : ""} ${spinningTheme === theme.id ? "is-spinning" : ""}`}
            data-theme-card={theme.id}
            key={theme.id}
            type="button"
            aria-label={`Usar tema ${theme.label}`}
            aria-pressed={activeTheme === theme.id}
            title={theme.label}
            onClick={(event) => selectTheme(theme.id, event)}
            onAnimationEnd={(event) => {
              if (event.animationName === "theme-card-spin") setSpinningTheme(null);
            }}
          >
            <img src={theme.character} alt="" />
            <span className="theme-card__poster" aria-hidden="true">
              <span className="theme-card__poster-top">
                <span>MYQWIZ<br />THEME</span>
                <span>DESIGN BY<br />MYQWIZ</span>
                <span>STUDY<br />MODE</span>
              </span>
              <span className="theme-card__poster-title">
                <strong>{theme.label}</strong>
                <small>{theme.description}</small>
              </span>
              <span className="theme-card__poster-footer">
                <span>CHARACTER THEME</span>
                <span>NO.{String(index + 1).padStart(2, "0")}</span>
                <span>MYQWIZ · 2026</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      </section>
    </>
  );
}

export default ThemeSwitcher;
