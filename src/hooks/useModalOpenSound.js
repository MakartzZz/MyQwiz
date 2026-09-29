import { useEffect } from "react";
import { playModalOpenSound } from "../services/uiSounds.js";

export function useModalOpenSound(isOpen) {
  useEffect(() => {
    if (isOpen) playModalOpenSound();
  }, [isOpen]);
}
