let confirmSound;

export const playConfirmSound = () => {
  if (typeof Audio === "undefined") return;
  if (!confirmSound) {
    confirmSound = new Audio("/sounds/confirm.mp3");
    confirmSound.preload = "auto";
    confirmSound.volume = 0.6;
  }

  confirmSound.currentTime = 0;
  confirmSound.play().catch(() => {});
};
