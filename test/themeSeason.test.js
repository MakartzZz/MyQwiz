import test from "node:test";
import assert from "node:assert/strict";
import { getSeasonalThemeSummary, getThemeSeasonStatus } from "../src/utils/themeSeason.js";

const halloween = {
  id: "halloween",
  label: "B.O.O.",
  season: {
    start: { month: 10, day: 1 },
    end: { month: 11, day: 3 },
  },
};

const christmas = {
  id: "christmas",
  label: "N.O.E.L.",
  season: {
    start: { month: 11, day: 25 },
    end: { month: 12, day: 28 },
  },
};

const valentine = {
  id: "valentine",
  label: "C.U.P.I.D.",
  season: {
    start: { month: 2, day: 8 },
    end: { month: 2, day: 15 },
  },
};

const easter = {
  id: "easter",
  label: "P.A.S.C.U.A.",
  season: {
    anchor: "easter",
    startOffsetDays: -7,
    endOffsetDays: 1,
  },
};

test("permanent themes remain available throughout the year", () => {
  assert.equal(getThemeSeasonStatus({ id: "violet" }, new Date(2026, 6, 1)).isAvailable, true);
});

test("seasonal themes include both boundary dates and count the final day", () => {
  assert.equal(getThemeSeasonStatus(halloween, new Date(2026, 8, 30)).isAvailable, false);
  assert.equal(getThemeSeasonStatus(halloween, new Date(2026, 9, 1)).remainingDays, 34);
  assert.equal(getThemeSeasonStatus(halloween, new Date(2026, 9, 20)).remainingDays, 15);
  assert.equal(getThemeSeasonStatus(halloween, new Date(2026, 10, 3)).remainingDays, 1);
  assert.equal(getThemeSeasonStatus(halloween, new Date(2026, 10, 4)).isAvailable, false);
});

test("season summary identifies the next theme when none is active", () => {
  const summary = getSeasonalThemeSummary([halloween, christmas], new Date(2026, 8, 20));

  assert.equal(summary.state, "upcoming");
  assert.equal(summary.theme.id, "halloween");
  assert.equal(summary.status.daysUntilStart, 11);
});

test("seasonal ranges can cross from December into January", () => {
  const newYear = {
    id: "new-year",
    season: {
      start: { month: 12, day: 29 },
      end: { month: 1, day: 7 },
    },
  };

  assert.equal(getThemeSeasonStatus(newYear, new Date(2027, 0, 2)).isAvailable, true);
  assert.equal(getThemeSeasonStatus(newYear, new Date(2027, 0, 2)).remainingDays, 6);
});

test("Valentine is available from February 8 through February 15", () => {
  assert.equal(getThemeSeasonStatus(valentine, new Date(2027, 1, 7)).isAvailable, false);
  assert.equal(getThemeSeasonStatus(valentine, new Date(2027, 1, 8)).remainingDays, 8);
  assert.equal(getThemeSeasonStatus(valentine, new Date(2027, 1, 15)).remainingDays, 1);
  assert.equal(getThemeSeasonStatus(valentine, new Date(2027, 1, 16)).isAvailable, false);
});

test("Easter follows its moving calendar window every year", () => {
  const status2026 = getThemeSeasonStatus(easter, new Date(2026, 3, 5));
  const status2027 = getThemeSeasonStatus(easter, new Date(2027, 2, 28));

  assert.equal(status2026.isAvailable, true);
  assert.equal(status2026.startDate.getTime(), new Date(2026, 2, 29).getTime());
  assert.equal(status2026.endDate.getTime(), new Date(2026, 3, 6).getTime());
  assert.equal(status2027.isAvailable, true);
  assert.equal(status2027.startDate.getTime(), new Date(2027, 2, 21).getTime());
  assert.equal(status2027.endDate.getTime(), new Date(2027, 2, 29).getTime());
});
