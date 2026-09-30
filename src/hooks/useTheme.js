import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_THEME, isValidTheme, THEME_STORAGE_KEY } from "../config/themes.js";
import { canPlayInterfaceSounds, getSoundScale, readUserPreferences } from "../services/userPreferences.js";

const readStoredTheme = () => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "sky" || theme === "pink" ? "light" : "dark";
};

export function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme);
  const changeSoundRef = useRef(null);

  useEffect(() => {
    const sound = new Audio("/sounds/theme-change.mp3");
    sound.preload = "auto";
    sound.volume = 0.35;
    changeSoundRef.current = sound;

    return () => {
      sound.pause();
      changeSoundRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still works for this session if storage is unavailable.
    }
  }, [theme]);

  const changeTheme = useCallback((nextTheme, origin) => {
    if (!isValidTheme(nextTheme) || nextTheme === theme) {
      return;
    }

    const changeSound = changeSoundRef.current;
    if (changeSound && canPlayInterfaceSounds()) {
      changeSound.currentTime = 0;
      changeSound.volume = 0.35 * getSoundScale();
      changeSound.play().catch(() => {});
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || readUserPreferences().reduceMotion;
    const canAnimateTransition = typeof document.startViewTransition === "function" && !prefersReducedMotion;

    if (!canAnimateTransition) {
      setTheme(nextTheme);
      return;
    }

    const bounds = origin?.getBoundingClientRect();
    const transitionX = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
    const transitionY = bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(
      Math.max(transitionX, window.innerWidth - transitionX),
      Math.max(transitionY, window.innerHeight - transitionY),
    );

    const transition = document.startViewTransition(() => {
      applyTheme(nextTheme);
      setTheme(nextTheme);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0 at ${transitionX}px ${transitionY}px)`,
              `circle(${radius}px at ${transitionX}px ${transitionY}px)`,
            ],
          },
          {
            duration: 480,
            easing: "cubic-bezier(.2, .8, .2, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // The theme is already applied even if the optional animation is interrupted.
      });
  }, [theme]);

  return { theme, changeTheme };
}
