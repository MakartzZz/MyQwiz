import { useState } from "react";
import { BookOpen, CircleCheckBig, CircleHelp, FileText, Lightbulb, Pencil } from "lucide-react";
import { themes } from "../config/themes.js";
import BlinkingCharacter from "./BlinkingCharacter.jsx";

const ribbonIcons = [
  CircleHelp, Lightbulb, Pencil, FileText, BookOpen, CircleCheckBig,
  Lightbulb, CircleHelp, FileText, Pencil, BookOpen, CircleCheckBig,
  Pencil, Lightbulb, CircleHelp, BookOpen, FileText, CircleCheckBig,
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
              {ribbonIcons.map((RibbonIcon, index) => (
                <span className="theme-ribbon__icon" style={{ "--icon-pop-index": ribbonIndex * 2 + group * ribbonIcons.length + index }} key={index}>
                  <RibbonIcon strokeWidth={1.8} />
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
            data-button-sound={activeTheme === theme.id ? undefined : "interface"}
            aria-label={`Usar tema ${theme.label}`}
            aria-pressed={activeTheme === theme.id}
            title={theme.label}
            onClick={(event) => selectTheme(theme.id, event)}
            onAnimationEnd={(event) => {
              if (event.animationName === "theme-card-spin") setSpinningTheme(null);
            }}
          >
            <BlinkingCharacter
              className="theme-card__character"
              src={theme.character}
              blinkSrc={theme.blinkCharacter}
              theme={theme.id}
            />
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
