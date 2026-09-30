import { canPlayInterfaceSounds, canPlayTypingSounds, getSoundScale } from "./userPreferences.js";
import { playBufferedSound, stopBufferedSound } from "./soundBuffer.js";

let confirmSound;
let notificationSound;
let modalOpenSound;
let buttonPressSound;
let lastTypingSoundAt = 0;
let lastModalOpenAt = 0;
let lastProminentSoundAt = 0;

const playInterfaceSound = (sound, path, volume, options = {}) => {
  if (!canPlayInterfaceSounds()) return sound;
  stopBufferedSound(sound);
  return playBufferedSound(path, { ...options, volume: Math.min(1, volume * getSoundScale()) });
};

export const playConfirmSound = () => {
  lastProminentSoundAt = Date.now();
  confirmSound = playInterfaceSound(confirmSound, "/sounds/confirm.mp3", 0.6);
};

export const playNotificationSound = () => {
  if (Date.now() - lastModalOpenAt < 350) return;
  lastProminentSoundAt = Date.now();
  notificationSound = playInterfaceSound(notificationSound, "/sounds/notification.mp3", 0.5);
};

export const playModalOpenSound = () => {
  lastModalOpenAt = Date.now();
  lastProminentSoundAt = Date.now();
  stopBufferedSound(notificationSound);
  modalOpenSound = playInterfaceSound(modalOpenSound, "/sounds/modal-open.mp3", 0.52);
};

export const playButtonPressSound = () => {
  if (typeof window === "undefined" || !canPlayInterfaceSounds()) return;

  window.setTimeout(() => {
    if (Date.now() - lastProminentSoundAt < 110) return;
    buttonPressSound = playInterfaceSound(buttonPressSound, "/sounds/button-press.mp3", 0.42);
  }, 35);
};

export const playTypingSound = () => {
  if (!canPlayTypingSounds()) return;

  const now = Date.now();
  if (now - lastTypingSoundAt < 42) return;
  lastTypingSoundAt = now;

  const volumeSteps = [0.105, 0.13, 0.155];
  const volume = volumeSteps[Math.floor(Math.random() * volumeSteps.length)] * getSoundScale();
  playBufferedSound("/sounds/typing.wav", {
    volume: Math.min(1, volume),
    playbackRate: 0.95 + Math.random() * 0.1,
  });
};
