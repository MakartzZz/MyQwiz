const DAY_IN_MS = 24 * 60 * 60 * 1000;

const calendarDayNumber = (date) => Date.UTC(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
) / DAY_IN_MS;

const addCalendarDays = (date, days) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate() + days,
);

export const getEasterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthIndex = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, monthIndex, day);
};

const seasonWrapsYear = ({ start, end }) => (
  end.month < start.month || (end.month === start.month && end.day < start.day)
);

const createSeasonWindow = (season, startYear) => {
  if (season.anchor === "easter") {
    const easterSunday = getEasterSunday(startYear);
    const startDate = addCalendarDays(easterSunday, season.startOffsetDays ?? 0);
    const endDate = addCalendarDays(easterSunday, season.endOffsetDays ?? 0);

    return {
      startDate,
      endDate,
      startDay: calendarDayNumber(startDate),
      endDay: calendarDayNumber(endDate),
    };
  }

  const endYear = seasonWrapsYear(season) ? startYear + 1 : startYear;
  const startDate = new Date(startYear, season.start.month - 1, season.start.day);
  const endDate = new Date(endYear, season.end.month - 1, season.end.day);

  return {
    startDate,
    endDate,
    startDay: calendarDayNumber(startDate),
    endDay: calendarDayNumber(endDate),
  };
};

export const getThemeSeasonStatus = (theme, referenceDate = new Date()) => {
  if (!theme?.season) {
    return {
      isSeasonal: false,
      isAvailable: true,
      remainingDays: null,
      daysUntilStart: null,
      startDate: null,
      endDate: null,
    };
  }

  const today = calendarDayNumber(referenceDate);
  const year = referenceDate.getFullYear();
  const windows = [year - 1, year, year + 1]
    .map((startYear) => createSeasonWindow(theme.season, startYear));
  const activeWindow = windows.find(({ startDay, endDay }) => today >= startDay && today <= endDay);

  if (activeWindow) {
    return {
      isSeasonal: true,
      isAvailable: true,
      remainingDays: activeWindow.endDay - today + 1,
      daysUntilStart: 0,
      startDate: activeWindow.startDate,
      endDate: activeWindow.endDate,
    };
  }

  const nextWindow = windows.find(({ startDay }) => startDay > today)
    ?? createSeasonWindow(theme.season, year + 2);

  return {
    isSeasonal: true,
    isAvailable: false,
    remainingDays: 0,
    daysUntilStart: nextWindow.startDay - today,
    startDate: nextWindow.startDate,
    endDate: nextWindow.endDate,
  };
};

export const getSeasonalThemeSummary = (seasonalThemes, referenceDate = new Date()) => {
  const entries = seasonalThemes.map((theme) => ({
    theme,
    status: getThemeSeasonStatus(theme, referenceDate),
  }));
  const active = entries.find(({ status }) => status.isAvailable);

  if (active) return { ...active, state: "active" };

  const next = entries.reduce((nearest, entry) => (
    !nearest || entry.status.daysUntilStart < nearest.status.daysUntilStart ? entry : nearest
  ), null);

  return next ? { ...next, state: "upcoming" } : null;
};
