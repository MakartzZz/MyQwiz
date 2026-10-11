import assert from "node:assert/strict";
import test from "node:test";
import { getThemeAudioCue, THEME_AUDIO_PATHS } from "../src/config/themeAudio.js";

test("BOO uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("halloween", "selection").path, "/sounds/themes/boo.mp3");
  assert.equal(getThemeAudioCue("halloween", "quizStart").path, "/sounds/themes/boo.mp3");
  assert.deepEqual(THEME_AUDIO_PATHS, [
    "/sounds/themes/nye.mp3",
    "/sounds/themes/cupid.mp3",
    "/sounds/themes/pascua.mp3",
    "/sounds/themes/boo.mp3",
    "/sounds/themes/noel.mp3",
    "/sounds/themes/surf.mp3",
    "/sounds/themes/bff.mp3",
    "/sounds/themes/tico.mp3",
  ]);
});

test("NYE uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("newyear", "selection").path, "/sounds/themes/nye.mp3");
  assert.equal(getThemeAudioCue("newyear", "quizStart").path, "/sounds/themes/nye.mp3");
});

test("CUPID uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("valentine", "selection").path, "/sounds/themes/cupid.mp3");
  assert.equal(getThemeAudioCue("valentine", "quizStart").path, "/sounds/themes/cupid.mp3");
});

test("PASCUA uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("easter", "selection").path, "/sounds/themes/pascua.mp3");
  assert.equal(getThemeAudioCue("easter", "quizStart").path, "/sounds/themes/pascua.mp3");
});

test("NOEL uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("christmas", "selection").path, "/sounds/themes/noel.mp3");
  assert.equal(getThemeAudioCue("christmas", "quizStart").path, "/sounds/themes/noel.mp3");
});

test("SURF uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("summer", "selection").path, "/sounds/themes/surf.mp3");
  assert.equal(getThemeAudioCue("summer", "quizStart").path, "/sounds/themes/surf.mp3");
});

test("BFF uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("friendship", "selection").path, "/sounds/themes/bff.mp3");
  assert.equal(getThemeAudioCue("friendship", "quizStart").path, "/sounds/themes/bff.mp3");
});

test("TICO uses its seasonal sound for selection and quiz start", () => {
  assert.equal(getThemeAudioCue("independence", "selection").path, "/sounds/themes/tico.mp3");
  assert.equal(getThemeAudioCue("independence", "quizStart").path, "/sounds/themes/tico.mp3");
});

test("themes without a custom sound keep the current defaults", () => {
  assert.equal(getThemeAudioCue("violet", "selection").path, "/sounds/theme-change.mp3");
  assert.equal(getThemeAudioCue("violet", "quizStart").path, "/sounds/confirm.mp3");
});
