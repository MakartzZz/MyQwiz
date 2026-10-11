const DEFAULT_THEME_AUDIO = Object.freeze({
  selection: Object.freeze({ path: "/sounds/theme-change.mp3", volume: 0.35 }),
  quizStart: Object.freeze({ path: "/sounds/confirm.mp3", volume: 0.6 }),
});

export const THEME_AUDIO_CUES = Object.freeze({
  newyear: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/nye.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/nye.mp3", volume: 0.62 }),
  }),
  valentine: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/cupid.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/cupid.mp3", volume: 0.62 }),
  }),
  easter: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/pascua.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/pascua.mp3", volume: 0.62 }),
  }),
  halloween: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/boo.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/boo.mp3", volume: 0.62 }),
  }),
  christmas: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/noel.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/noel.mp3", volume: 0.62 }),
  }),
  summer: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/surf.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/surf.mp3", volume: 0.62 }),
  }),
  friendship: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/bff.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/bff.mp3", volume: 0.62 }),
  }),
  independence: Object.freeze({
    selection: Object.freeze({ path: "/sounds/themes/tico.mp3", volume: 0.62 }),
    quizStart: Object.freeze({ path: "/sounds/themes/tico.mp3", volume: 0.62 }),
  }),
});

export const THEME_AUDIO_PATHS = Object.freeze([
  ...new Set(
    Object.values(THEME_AUDIO_CUES)
      .flatMap((cues) => Object.values(cues))
      .map((cue) => cue.path),
  ),
]);

export const getThemeAudioCue = (themeId, cueName) => (
  THEME_AUDIO_CUES[themeId]?.[cueName]
  ?? DEFAULT_THEME_AUDIO[cueName]
  ?? null
);
