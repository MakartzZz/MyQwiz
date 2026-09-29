let confirmSound;
let notificationSound;
let modalOpenSound;
let lastModalOpenAt = 0;

const stopSound = (sound) => {
  if (!sound) return;
  sound.pause();
  sound.currentTime = 0;
};

const playCachedSound = (sound, path, volume) => {
  if (typeof Audio === "undefined") return sound;
  const nextSound = sound ?? new Audio(path);
  nextSound.preload = "auto";
  nextSound.volume = volume;
  nextSound.currentTime = 0;
  nextSound.play().catch(() => {});
  return nextSound;
};

export const playConfirmSound = () => {
  confirmSound = playCachedSound(confirmSound, "/sounds/confirm.mp3", 0.6);
};

export const playNotificationSound = () => {
  if (Date.now() - lastModalOpenAt < 350) return;
  notificationSound = playCachedSound(notificationSound, "/sounds/notification.mp3", 0.5);
};

export const playModalOpenSound = () => {
  lastModalOpenAt = Date.now();
  stopSound(notificationSound);
  modalOpenSound = playCachedSound(modalOpenSound, "/sounds/modal-open.mp3", 0.52);
};
