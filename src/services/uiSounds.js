import { canPlayInterfaceSounds, canPlayTypingSounds, getSoundScale } from "./userPreferences.js";

let confirmSound;
let notificationSound;
let modalOpenSound;
let buttonPressSound;
let typingSoundPool;
let typingSoundIndex = 0;
let lastTypingSoundAt = 0;
let lastModalOpenAt = 0;
let lastProminentSoundAt = 0;

const stopSound = (sound) => {
  if (!sound) return;
  sound.pause();
  sound.currentTime = 0;
};

const playCachedSound = (sound, path, volume) => {
  if (typeof Audio === "undefined" || !canPlayInterfaceSounds()) return sound;
  const nextSound = sound ?? new Audio(path);
  nextSound.preload = "auto";
  nextSound.volume = Math.min(1, volume * getSoundScale());
  nextSound.currentTime = 0;
  nextSound.play().catch(() => {});
  return nextSound;
};

export const playConfirmSound = () => {
  lastProminentSoundAt = Date.now();
  confirmSound = playCachedSound(confirmSound, "/sounds/confirm.mp3", 0.6);
};

export const playNotificationSound = () => {
  if (Date.now() - lastModalOpenAt < 350) return;
  lastProminentSoundAt = Date.now();
  notificationSound = playCachedSound(notificationSound, "/sounds/notification.mp3", 0.5);
};

export const playModalOpenSound = () => {
  lastModalOpenAt = Date.now();
  lastProminentSoundAt = Date.now();
  stopSound(notificationSound);
  modalOpenSound = playCachedSound(modalOpenSound, "/sounds/modal-open.mp3", 0.52);
};

export const playButtonPressSound = () => {
  if (typeof window === "undefined" || !canPlayInterfaceSounds()) return;

  window.setTimeout(() => {
    if (Date.now() - lastProminentSoundAt < 110) return;
    buttonPressSound = playCachedSound(buttonPressSound, "/sounds/button-press.mp3", 0.42);
  }, 35);
};

export const playTypingSound = () => {
  if (typeof Audio === "undefined" || !canPlayTypingSounds()) return;

  const now = Date.now();
  if (now - lastTypingSoundAt < 42) return;
  lastTypingSoundAt = now;

  if (!typingSoundPool) {
    typingSoundPool = Array.from({ length: 4 }, () => {
      const sound = new Audio("/sounds/typing.wav");
      sound.preload = "auto";
      return sound;
    });
  }

  const sound = typingSoundPool[typingSoundIndex];
  typingSoundIndex = (typingSoundIndex + 1) % typingSoundPool.length;
  const volumeSteps = [0.105, 0.13, 0.155];
  sound.pause();
  sound.currentTime = 0;
  sound.volume = Math.min(1, volumeSteps[Math.floor(Math.random() * volumeSteps.length)] * getSoundScale());
  sound.playbackRate = 0.95 + Math.random() * 0.1;
  sound.play().catch(() => {});
};
