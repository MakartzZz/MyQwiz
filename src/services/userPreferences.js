export const USER_PREFERENCES_STORAGE_KEY = "myqwiz:user-preferences";

export const DEFAULT_USER_PREFERENCES = Object.freeze({
  interfaceSounds: true,
  typingSounds: true,
  gameplaySounds: true,
  catRewardSounds: true,
  soundLevel: 2,
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  automaticQuestionAdvance: true,
});

const SOUND_LEVEL_SCALE = Object.freeze([0.45, 0.72, 1]);
let cachedPreferences;

export const normalizeUserPreferences = (value = {}) => ({
  interfaceSounds: value.interfaceSounds !== false,
  typingSounds: value.typingSounds !== false,
  gameplaySounds: value.gameplaySounds !== false,
  catRewardSounds: value.catRewardSounds !== false,
  soundLevel: [0, 1, 2].includes(value.soundLevel) ? value.soundLevel : DEFAULT_USER_PREFERENCES.soundLevel,
  reduceMotion: value.reduceMotion === true,
  highContrast: value.highContrast === true,
  largeText: value.largeText === true,
  automaticQuestionAdvance: value.automaticQuestionAdvance !== false,
});

export const readUserPreferences = () => {
  if (cachedPreferences) return cachedPreferences;

  try {
    const stored = JSON.parse(window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY) ?? "{}");
    cachedPreferences = normalizeUserPreferences(stored);
  } catch {
    cachedPreferences = { ...DEFAULT_USER_PREFERENCES };
  }

  return cachedPreferences;
};

export const applyUserPreferences = (preferences = readUserPreferences()) => {
  const root = document.documentElement;
  root.dataset.reduceMotion = String(preferences.reduceMotion);
  root.dataset.highContrast = String(preferences.highContrast);
  root.dataset.largeText = String(preferences.largeText);
};

export const saveUserPreferences = (nextPreferences) => {
  cachedPreferences = normalizeUserPreferences(nextPreferences);
  applyUserPreferences(cachedPreferences);

  try {
    window.localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(cachedPreferences));
  } catch {
    // The preferences remain active for this session when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent("myqwiz:preferences-change", { detail: cachedPreferences }));
  return cachedPreferences;
};

export const getSoundScale = () => SOUND_LEVEL_SCALE[readUserPreferences().soundLevel];
export const canPlayInterfaceSounds = () => readUserPreferences().interfaceSounds;
export const canPlayTypingSounds = () => {
  const preferences = readUserPreferences();
  return preferences.interfaceSounds && preferences.typingSounds;
};
export const canPlayGameplaySounds = () => readUserPreferences().gameplaySounds;
export const canPlayCatRewardSounds = () => {
  const preferences = readUserPreferences();
  return preferences.interfaceSounds && preferences.catRewardSounds;
};
