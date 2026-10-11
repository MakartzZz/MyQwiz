import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_THEME, isValidTheme, SEASONAL_THEME_LOCKING_ENABLED, themes, THEME_STORAGE_KEY } from "../config/themes.js";
import { playBufferedSound, stopBufferedSound } from "../services/soundBuffer.js";
import { canPlayInterfaceSounds, getSoundScale, readUserPreferences } from "../services/userPreferences.js";
import { getThemeSeasonStatus } from "../utils/themeSeason.js";

const isThemeAvailable = (themeId, referenceDate = new Date()) => {
  const theme = themes.find((item) => item.id === themeId);
  return Boolean(theme && (
    !SEASONAL_THEME_LOCKING_ENABLED
    || getThemeSeasonStatus(theme, referenceDate).isAvailable
  ));
};

const readStoredTheme = () => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) && isThemeAvailable(storedTheme) ? storedTheme : DEFAULT_THEME;
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
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const changeSoundRef = useRef(null);

  useEffect(() => {
    return () => stopBufferedSound(changeSoundRef.current);
  }, []);

  useEffect(() => {
    let dayChangeTimer;

    const scheduleNextDay = () => {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      dayChangeTimer = window.setTimeout(() => {
        setCalendarDate(new Date());
        scheduleNextDay();
      }, nextDay.getTime() - now.getTime());
    };

    scheduleNextDay();
    return () => window.clearTimeout(dayChangeTimer);
  }, []);

  useEffect(() => {
    if (!isThemeAvailable(theme, calendarDate)) setTheme(DEFAULT_THEME);
  }, [calendarDate, theme]);

  useLayoutEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still works for this session if storage is unavailable.
    }
  }, [theme]);

  const changeTheme = useCallback((nextTheme, origin) => {
    if (!isValidTheme(nextTheme) || !isThemeAvailable(nextTheme, calendarDate) || nextTheme === theme) {
      return;
    }

    if (canPlayInterfaceSounds()) {
      stopBufferedSound(changeSoundRef.current);
      changeSoundRef.current = playBufferedSound("/sounds/theme-change.mp3", { volume: 0.35 * getSoundScale() });
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
  }, [calendarDate, theme]);

  return { theme, changeTheme, calendarDate };
}
