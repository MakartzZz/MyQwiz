import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  CircleHelp,
  FileText,
  Lightbulb,
  LockKeyhole,
  Pencil,
} from "lucide-react";
import { permanentThemes, SEASONAL_THEME_LOCKING_ENABLED, seasonalThemes } from "../config/themes.js";
import { getSeasonalThemeSummary, getThemeSeasonStatus } from "../utils/themeSeason.js";
import BlinkingCharacter from "./BlinkingCharacter.jsx";

const ribbonIcons = [
  CircleHelp, Lightbulb, Pencil, FileText, BookOpen, CircleCheckBig,
  Lightbulb, CircleHelp, FileText, Pencil, BookOpen, CircleCheckBig,
  Pencil, Lightbulb, CircleHelp, BookOpen, FileText, CircleCheckBig,
];

const responsiveRibbonIcons = Array.from({ length: 3 }, (_, cycle) =>
  ribbonIcons.map((RibbonIcon, index) => ({ RibbonIcon, cycle, index })),
).flat();

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
              {responsiveRibbonIcons.map(({ RibbonIcon, cycle, index }, itemIndex) => (
                <span
                  className={`theme-ribbon__icon ${cycle === 1 ? "theme-ribbon__icon--tablet-extra" : ""} ${cycle === 2 ? "theme-ribbon__icon--mobile-extra" : ""}`}
                  style={{ "--icon-pop-index": ribbonIndex * 2 + group * responsiveRibbonIcons.length + itemIndex }}
                  key={`${cycle}-${index}`}
                >
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

const dayCountLabel = (days) => `${days} ${days === 1 ? "día" : "días"}`;

const monthLabels = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const formatSeasonRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "FECHA VARIABLE";

  return `${startDate.getDate()} ${monthLabels[startDate.getMonth()]} — ${endDate.getDate()} ${monthLabels[endDate.getMonth()]}`;
};

function ThemeCard({ theme, index, activeTheme, currentDate, spinningTheme, onSelect, onSpinEnd }) {
  const seasonStatus = getThemeSeasonStatus(theme, currentDate);
  const isLocked = SEASONAL_THEME_LOCKING_ENABLED && !seasonStatus.isAvailable;
  const seasonDateLabel = theme.season?.dateLabel
    ?? formatSeasonRange(seasonStatus.startDate, seasonStatus.endDate);

  return (
    <button
      className={`theme-card ${activeTheme === theme.id ? "is-active" : ""} ${spinningTheme === theme.id ? "is-spinning" : ""} ${isLocked ? "is-locked" : ""}`}
      data-theme-card={theme.id}
      type="button"
      disabled={isLocked}
      data-button-sound={activeTheme === theme.id || isLocked ? undefined : "interface"}
      aria-label={isLocked ? `${theme.label}, disponible del ${seasonDateLabel}` : `Usar tema ${theme.label}`}
      aria-pressed={activeTheme === theme.id}
      title={isLocked ? `Disponible del ${seasonDateLabel}` : theme.label}
      onClick={(event) => onSelect(theme.id, event)}
      onAnimationEnd={onSpinEnd}
    >
      <BlinkingCharacter
        className="theme-card__character"
        src={theme.previewCharacter ?? theme.character}
        blinkSrc={theme.previewBlinkCharacter ?? theme.blinkCharacter}
        theme={theme.id}
        loading="lazy"
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
          {theme.season && (
            <span className="theme-card__season-date">
              <CalendarDays size={13} strokeWidth={2.2} /> {seasonDateLabel}
            </span>
          )}
        </span>
        <span className="theme-card__poster-footer">
          <span>CHARACTER THEME</span>
          <span>NO.{String(index + 1).padStart(2, "0")}</span>
          <span>MYQWIZ · 2026</span>
        </span>
      </span>
      {isLocked && (
        <span className="theme-card__lock" aria-hidden="true">
          <LockKeyhole size={20} strokeWidth={2.3} />
          <strong>Fuera de temporada</strong>
        </span>
      )}
    </button>
  );
}

function ThemeSwitcher({ activeTheme, currentDate = new Date(), onChange }) {
  const [spinningTheme, setSpinningTheme] = useState(null);
  const seasonalSummary = getSeasonalThemeSummary(seasonalThemes, currentDate);

  const selectTheme = (themeId, event) => {
    setSpinningTheme(themeId);
    onChange(themeId, event.currentTarget);
  };

  const renderThemeCard = (theme, index) => (
    <ThemeCard
      activeTheme={activeTheme}
      currentDate={currentDate}
      index={index}
      key={theme.id}
      onSelect={selectTheme}
      onSpinEnd={(event) => {
        if (event.animationName === "theme-card-spin") setSpinningTheme(null);
      }}
      spinningTheme={spinningTheme}
      theme={theme}
    />
  );

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
          {permanentThemes.map(renderThemeCard)}
        </div>

        <div className="seasonal-theme-heading">
          <span className="eyebrow">Tema de temporada</span>
          {seasonalSummary?.state === "active" ? (
            <>
              <h3>{seasonalSummary.theme.label} está disponible</h3>
              <p>
                {seasonalSummary.status.remainingDays === 1
                  ? "Este es su último día activo."
                  : `Estará activo durante ${dayCountLabel(seasonalSummary.status.remainingDays)} más.`}
              </p>
            </>
          ) : seasonalSummary ? (
            <>
              <h3>La próxima temporada está por llegar</h3>
              <p>{seasonalSummary.theme.label} se desbloquea en {dayCountLabel(seasonalSummary.status.daysUntilStart)}.</p>
            </>
          ) : (
            <p>Los temas especiales se desbloquean automáticamente en sus fechas.</p>
          )}
        </div>

        <div className="theme-gallery theme-gallery--seasonal">
          {seasonalThemes.map((theme, index) => renderThemeCard(theme, permanentThemes.length + index))}
        </div>
      </section>
    </>
  );
}

export default ThemeSwitcher;
