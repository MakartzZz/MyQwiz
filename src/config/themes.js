import makinCharacter from "../assets/characters/maz-theme-card-v3.webp";
import makinCharacterBlink from "../assets/characters/maz-theme-card-blink.webp";
import blueCharacter from "../assets/characters/mrg-theme-card-v2.webp";
import blueCharacterBlink from "../assets/characters/mrg-theme-card-blink.webp";
import darkCharacter from "../assets/characters/zn-theme-card-v1.webp";
import darkCharacterBlink from "../assets/characters/zn-theme-card-blink.webp";
import pinkCharacter from "../assets/characters/pink-theme-card-v1.webp";
import pinkCharacterBlink from "../assets/characters/pink-theme-card-blink.webp";

export const THEME_STORAGE_KEY = "myqwiz-theme";

export const themes = [
  {
    id: "violet",
    label: "M.A.Z.",
    description: "Verde oliva y destellos plata",
    character: makinCharacter,
    blinkCharacter: makinCharacterBlink,
  },
  {
    id: "sky",
    label: "M.R.G.",
    description: "Azul luminoso y blanco",
    character: blueCharacter,
    blinkCharacter: blueCharacterBlink,
  },
  {
    id: "midnight",
    label: "Z.N.",
    description: "Negro profundo y luz ámbar",
    character: darkCharacter,
    blinkCharacter: darkCharacterBlink,
  },
  {
    id: "pink",
    label: "L.V.",
    description: "Rosa fresa, crema y frambuesa",
    character: pinkCharacter,
    blinkCharacter: pinkCharacterBlink,
  },
];

export const DEFAULT_THEME = themes[0].id;

export const isValidTheme = (theme) => themes.some((item) => item.id === theme);
