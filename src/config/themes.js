import makinCharacter from "../assets/characters/maz-theme-card-v3.webp";
import makinCharacterBlink from "../assets/characters/maz-theme-card-blink.webp";
import makinCharacterPreview from "../assets/characters/maz-theme-card-v3-preview.webp";
import makinCharacterBlinkPreview from "../assets/characters/maz-theme-card-blink-preview.webp";
import blueCharacter from "../assets/characters/mrg-theme-card-v2.webp";
import blueCharacterBlink from "../assets/characters/mrg-theme-card-blink.webp";
import blueCharacterPreview from "../assets/characters/mrg-theme-card-v2-preview.webp";
import blueCharacterBlinkPreview from "../assets/characters/mrg-theme-card-blink-preview.webp";
import darkCharacter from "../assets/characters/zn-theme-card-v1.webp";
import darkCharacterBlink from "../assets/characters/zn-theme-card-blink.webp";
import darkCharacterPreview from "../assets/characters/zn-theme-card-v1-preview.webp";
import darkCharacterBlinkPreview from "../assets/characters/zn-theme-card-blink-preview.webp";
import pinkCharacter from "../assets/characters/pink-theme-card-v1.webp";
import pinkCharacterBlink from "../assets/characters/pink-theme-card-blink.webp";
import pinkCharacterPreview from "../assets/characters/pink-theme-card-v1-preview.webp";
import pinkCharacterBlinkPreview from "../assets/characters/pink-theme-card-blink-preview.webp";
import halloweenCharacter from "../assets/characters/boo-theme-card-v1.webp";
import halloweenCharacterBlink from "../assets/characters/boo-theme-card-blink.webp";
import halloweenCharacterPreview from "../assets/characters/boo-theme-card-v1-preview.webp";
import halloweenCharacterBlinkPreview from "../assets/characters/boo-theme-card-blink-preview.webp";
import christmasCharacter from "../assets/characters/noel-theme-card-v1.webp";
import christmasCharacterBlink from "../assets/characters/noel-theme-card-blink.webp";
import christmasCharacterPreview from "../assets/characters/noel-theme-card-v1-preview.webp";
import christmasCharacterBlinkPreview from "../assets/characters/noel-theme-card-blink-preview.webp";
import newYearCharacter from "../assets/characters/newyear-theme-card-v1.webp";
import newYearCharacterBlink from "../assets/characters/newyear-theme-card-blink.webp";
import newYearCharacterPreview from "../assets/characters/newyear-theme-card-v1-preview.webp";
import newYearCharacterBlinkPreview from "../assets/characters/newyear-theme-card-blink-preview.webp";
import valentineCharacter from "../assets/characters/valentine-theme-card-v1.webp";
import valentineCharacterBlink from "../assets/characters/valentine-theme-card-blink.webp";
import valentineCharacterPreview from "../assets/characters/valentine-theme-card-v1-preview.webp";
import valentineCharacterBlinkPreview from "../assets/characters/valentine-theme-card-blink-preview.webp";
import easterCharacter from "../assets/characters/easter-theme-card-v1.webp";
import easterCharacterBlink from "../assets/characters/easter-theme-card-blink.webp";
import easterCharacterPreview from "../assets/characters/easter-theme-card-v1-preview.webp";
import easterCharacterBlinkPreview from "../assets/characters/easter-theme-card-blink-preview.webp";

export const THEME_STORAGE_KEY = "myqwiz-theme";
export const SEASONAL_THEME_LOCKING_ENABLED = false;

export const themes = [
  {
    id: "violet",
    label: "M.A.Z.",
    description: "Verde oliva y destellos plata",
    character: makinCharacter,
    blinkCharacter: makinCharacterBlink,
    previewCharacter: makinCharacterPreview,
    previewBlinkCharacter: makinCharacterBlinkPreview,
  },
  {
    id: "sky",
    label: "M.R.G.",
    description: "Azul luminoso y blanco",
    character: blueCharacter,
    blinkCharacter: blueCharacterBlink,
    previewCharacter: blueCharacterPreview,
    previewBlinkCharacter: blueCharacterBlinkPreview,
  },
  {
    id: "midnight",
    label: "Z.N.",
    description: "Negro profundo y luz ámbar",
    character: darkCharacter,
    blinkCharacter: darkCharacterBlink,
    previewCharacter: darkCharacterPreview,
    previewBlinkCharacter: darkCharacterBlinkPreview,
  },
  {
    id: "pink",
    label: "L.V.",
    description: "Rosa fresa, crema y frambuesa",
    character: pinkCharacter,
    blinkCharacter: pinkCharacterBlink,
    previewCharacter: pinkCharacterPreview,
    previewBlinkCharacter: pinkCharacterBlinkPreview,
  },
  {
    id: "newyear",
    label: "N.Y.E.",
    season: {
      start: { month: 12, day: 29 },
      end: { month: 1, day: 7 },
      dateLabel: "29 DIC — 7 ENE",
    },
    description: "Azul medianoche, magenta y oro champaña",
    character: newYearCharacter,
    blinkCharacter: newYearCharacterBlink,
    previewCharacter: newYearCharacterPreview,
    previewBlinkCharacter: newYearCharacterBlinkPreview,
  },
  {
    id: "valentine",
    label: "C.U.P.I.D.",
    season: {
      start: { month: 2, day: 8 },
      end: { month: 2, day: 15 },
      dateLabel: "8 FEB — 15 FEB",
    },
    description: "Rojo frambuesa, crema hueso y oro",
    character: valentineCharacter,
    blinkCharacter: valentineCharacterBlink,
    previewCharacter: valentineCharacterPreview,
    previewBlinkCharacter: valentineCharacterBlinkPreview,
  },
  {
    id: "easter",
    label: "P.A.S.C.U.A.",
    season: {
      anchor: "easter",
      startOffsetDays: -7,
      endOffsetDays: 1,
    },
    description: "Lavanda, azul huevo, menta y crema",
    character: easterCharacter,
    blinkCharacter: easterCharacterBlink,
    previewCharacter: easterCharacterPreview,
    previewBlinkCharacter: easterCharacterBlinkPreview,
  },
  {
    id: "halloween",
    label: "B.O.O.",
    season: {
      start: { month: 10, day: 1 },
      end: { month: 11, day: 3 },
      dateLabel: "1 OCT — 3 NOV",
    },
    description: "Violeta espectral y naranja calabaza",
    character: halloweenCharacter,
    blinkCharacter: halloweenCharacterBlink,
    previewCharacter: halloweenCharacterPreview,
    previewBlinkCharacter: halloweenCharacterBlinkPreview,
  },
  {
    id: "christmas",
    label: "N.O.E.L.",
    season: {
      start: { month: 11, day: 25 },
      end: { month: 12, day: 28 },
      dateLabel: "25 NOV — 28 DIC",
    },
    description: "Verde pino, rojo arándano y luz dorada",
    character: christmasCharacter,
    blinkCharacter: christmasCharacterBlink,
    previewCharacter: christmasCharacterPreview,
    previewBlinkCharacter: christmasCharacterBlinkPreview,
  },
];

export const DEFAULT_THEME = themes[0].id;

export const isValidTheme = (theme) => themes.some((item) => item.id === theme);

export const permanentThemes = themes.filter((theme) => !theme.season);

export const seasonalThemes = themes.filter((theme) => theme.season);
