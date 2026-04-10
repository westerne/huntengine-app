// ─────────────────────────────────────────────────────────────────────────────
// WYOMING DEER DATA
// All draw data sourced from Wyoming Game & Fish Demand Reports
// NR Regular Pool: preference point draw (highest points first)
// NR Special Pool: special preference point draw
// NR Random Pool: pure random lottery (~25% of tags)
// NR Special Random Pool: random portion of special pool
// Resident Pool: pure random draw (no preference points for WY resident deer)
// Years: 2024, 2025
// ─────────────────────────────────────────────────────────────────────────────

export type DrawYearData = {
  year: number;
  nr_regular: { quota: number; minPoints: number | null; oddsAtMin: string | null; notes?: string };
  nr_special: { quota: number; minPoints: number | null; oddsAtMin: string | null; notes?: string };
  nr_random: { quota: number; firstChoiceApplicants: number; approxOdds: string | null };
  nr_special_random: { quota: number; firstChoiceApplicants: number; approxOdds: string | null };
  resident: { quota: number; firstChoiceApplicants: number; approxOdds: string | null };
};

export type WyomingDeerUnit = {
  typical: string;
  topEnd: string;
  trait: string;
  description: string;
  coords: { lat: number; lng: number };
  huntType: string; // "1" = Limited Antlered Mule Deer, "3" = Any Whitetail, etc.
  seasons: {
    archery?: { open: string; close: string; notes?: string };
    rifle?: { open: string; close: string; notes?: string };
    muzzleloader?: { open: string; close: string; notes?: string };
  };
  drawHistory: DrawYearData[];
};

export const WYOMING_DEER_UNITS: Record<string, WyomingDeerUnit> = {

  // ── TOP TIER MULE DEER ────────────────────────────────────────────────────

  "141": {
    typical: '175-190"', topEnd: '190"+',
    trait: "True alpine giants; the 'Grey Ghost' genetics.",
    description: "Wyoming Range West of Daniel. Focus: Hoback Basin and McDougal Gap. Steep, high-altitude alpine terrain.",
    coords: { lat: 43.2847, lng: -109.9553 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31", notes: "General rifle season" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 3,  minPoints: 17, oddsAtMin: "50.00%",  notes: "78 applicants shut out below 16 pts" },
        nr_special:        { quota: 3,  minPoints: 14, oddsAtMin: "100%",    notes: "36 applicants shut out below 14 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 78,   approxOdds: "1.28%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 36,   approxOdds: "2.78%" },
        resident:          { quota: 38, firstChoiceApplicants: 852,  approxOdds: "4.46%", },
      },
      {
        year: 2024,
        nr_regular:        { quota: 3,  minPoints: 15, oddsAtMin: "100%",   notes: "76 applicants shut out below 14 pts" },
        nr_special:        { quota: 3,  minPoints: 11, oddsAtMin: "50.00%", notes: "12 applicants shut out below 11 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 76,   approxOdds: "1.32%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 12,   approxOdds: "8.33%" },
        resident:          { quota: 39, firstChoiceApplicants: 747,  approxOdds: "5.22%" },
      },
    ],
  },

  "128": {
    typical: '170-185"', topEnd: '200"+',
    trait: "Migration corridor; mass and beam length.",
    description: "Wind River Front near Dubois. Focus: East Fork and Horse Creek. Transitional mountain terrain.",
    coords: { lat: 43.5777, lng: -109.6397 },
    huntType: "1 — Any Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 5,  minPoints: 19, oddsAtMin: "4.42%",  notes: "HARDEST NR deer draw in WY. 1,244 applicants shut out below 19 pts." },
        nr_special:        { quota: 3,  minPoints: 19, oddsAtMin: "5.88%",  notes: "456 applicants shut out below 19 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 1352, approxOdds: "0.07%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 504,  approxOdds: "0.20%" },
        resident:          { quota: 40, firstChoiceApplicants: 3611, approxOdds: "1.11%", },
      },
      {
        year: 2024,
        nr_regular:        { quota: 5,  minPoints: 18, oddsAtMin: "3.60%",  notes: "1,055 applicants shut out below 18 pts" },
        nr_special:        { quota: 3,  minPoints: 18, oddsAtMin: "5.77%",  notes: "424 applicants shut out below 18 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 1189, approxOdds: "0.08%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 473,  approxOdds: "0.21%" },
        resident:          { quota: 40, firstChoiceApplicants: 3414, approxOdds: "1.17%" },
      },
    ],
  },

  "102": {
    typical: '165-180"', topEnd: '200"+',
    trait: "High desert island genetics; deep forks.",
    description: "Southwest WY, South of Rock Springs. Focus: Little Mountain, Aspen Mountain. NOT Wyoming Range.",
    coords: { lat: 41.2448, lng: -109.185 },
    huntType: "1 — Any Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 9,  minPoints: 19, oddsAtMin: "4.42%",  notes: "EXTREME — 581 applicants shut out below 18 pts" },
        nr_special:        { quota: 7,  minPoints: 17, oddsAtMin: "26.67%", notes: "141 applicants shut out below 17 pts" },
        nr_random:         { quota: 3,  firstChoiceApplicants: 581,  approxOdds: "0.52%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 152,  approxOdds: "1.32%" },
        resident:          { quota: 100, firstChoiceApplicants: 3482, approxOdds: "2.87%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 9,  minPoints: 18, oddsAtMin: "2.38%",  notes: "410 applicants shut out below 17 pts" },
        nr_special:        { quota: 6,  minPoints: 16, oddsAtMin: "25.00%", notes: "116 applicants shut out below 16 pts" },
        nr_random:         { quota: 3,  firstChoiceApplicants: 412,  approxOdds: "0.73%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 125,  approxOdds: "1.60%" },
        resident:          { quota: 102, firstChoiceApplicants: 3230, approxOdds: "3.16%" },
      },
    ],
  },

  "87": {
    typical: '155-175"', topEnd: '190"',
    trait: "Sagebrush desert genetics; heavy mass.",
    description: "South Central WY near Baggs. Focus: Atlantic Rim and Muddy Creek. High desert sage ridges.",
    coords: { lat: 42.174, lng: -107.1266 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 0,  minPoints: null, oddsAtMin: null, notes: "Quota = 0; 5 applicants at 18 pts drew 0%" },
        nr_special:        { quota: 0,  minPoints: null, oddsAtMin: null, notes: "Quota = 0 in special draw" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 77,   approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 36,   approxOdds: null },
        resident:          { quota: 25, firstChoiceApplicants: 1167, approxOdds: "2.14%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 0,  minPoints: null, oddsAtMin: null, notes: "Quota = 0; 11 applicants at 17 pts drew 0%" },
        nr_special:        { quota: 1,  minPoints: 18, oddsAtMin: "100%", notes: "43 applicants shut out below 18 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 103,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 43,   approxOdds: null },
        resident:          { quota: 27, firstChoiceApplicants: 1158, approxOdds: "2.33%" },
      },
    ],
  },

  "89": {
    typical: '160-175"', topEnd: '195"',
    trait: "Desert ridge genetics; wide frames.",
    description: "The Ferris Mountains North of Rawlins. Focus: Granite peaks surrounded by sagebrush desert.",
    coords: { lat: 42.8218, lng: -107.0095 },
    huntType: "1 — Antlered Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 9,  minPoints: 15, oddsAtMin: "33.33%", notes: "166 applicants shut out below 15 pts" },
        nr_special:        { quota: 6,  minPoints: 11, oddsAtMin: "100%",   notes: "35 applicants shut out below 11 pts" },
        nr_random:         { quota: 3,  firstChoiceApplicants: 169, approxOdds: "1.78%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 35,  approxOdds: "5.71%" },
        resident:          { quota: 67, firstChoiceApplicants: 871, approxOdds: "7.69%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 8,  minPoints: 13, oddsAtMin: "37.50%", notes: "167 applicants shut out below 13 pts" },
        nr_special:        { quota: 6,  minPoints: 13, oddsAtMin: "80.00%", notes: "36 applicants shut out below 13 pts" },
        nr_random:         { quota: 2,  firstChoiceApplicants: 170, approxOdds: "1.18%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 36,  approxOdds: "2.78%" },
        resident:          { quota: 71, firstChoiceApplicants: 800, approxOdds: "8.88%" },
      },
    ],
  },

  "130": {
    typical: '170-185"', topEnd: '205"+',
    trait: "Desert migration staging genetics.",
    description: "South of Pinedale. Focus: The Mesa and Scab Creek. Transition from Wind River high country to desert.",
    coords: { lat: 42.4136, lng: -109.2384 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 0,  minPoints: null, oddsAtMin: null, notes: "Quota = 0; 19 pts still 0%" },
        nr_special:        { quota: 1,  minPoints: 19, oddsAtMin: "100%", notes: "16 applicants shut out below 19 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 38,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 16,  approxOdds: null },
        resident:          { quota: 4,  firstChoiceApplicants: 430, approxOdds: "0.93%", },
      },
      {
        year: 2024,
        nr_regular:        { quota: 0,  minPoints: null, oddsAtMin: null, notes: "Quota = 0; 18 pts still 0%" },
        nr_special:        { quota: 1,  minPoints: 15, oddsAtMin: "100%", notes: "11 applicants shut out below 15 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 41,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 11,  approxOdds: null },
        resident:          { quota: 4,  firstChoiceApplicants: 395, approxOdds: "1.01%" },
      },
    ],
  },

  "101": {
    typical: '155-170"', topEnd: '185"',
    trait: "Extreme desert survivalists.",
    description: "West of Unit 102. Focus: Bitter Creek and the Checkerboard lands. Flat sage and dry coulees.",
    coords: { lat: 41.3483, lng: -108.7096 },
    huntType: "1 — Antlered Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 2,  minPoints: 17, oddsAtMin: "50.00%", notes: "81 applicants shut out below 17 pts" },
        nr_special:        { quota: 2,  minPoints: 19, oddsAtMin: "100%",   notes: "17 applicants shut out below 19 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 82,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 17,  approxOdds: null },
        resident:          { quota: 14, firstChoiceApplicants: 660, approxOdds: "2.12%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 0,  minPoints: null, oddsAtMin: null, notes: "Quota = 0; 4 applicants at 18 pts drew 0%" },
        nr_special:        { quota: 1,  minPoints: 18, oddsAtMin: "50.00%", notes: "17 applicants shut out below 18 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 95,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 18,  approxOdds: null },
        resident:          { quota: 16, firstChoiceApplicants: 678, approxOdds: "2.36%" },
      },
    ],
  },

  "105": {
    typical: '165-180"', topEnd: '195"',
    trait: "High desert migration stop.",
    description: "McCullough Peaks near Cody. Focus: Badlands and desert draws. Extreme clay terrain.",
    coords: { lat: 44.9287, lng: -109.4137 },
    huntType: "1 — Any Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 1,  minPoints: 19, oddsAtMin: "100%",   notes: "Only 1 tag; 31 applicants shut out below 19 pts" },
        nr_special:        { quota: 1,  minPoints: 19, oddsAtMin: "50.00%", notes: "15 applicants shut out below 19 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 31,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 16,  approxOdds: null },
        resident:          { quota: 15, firstChoiceApplicants: 742, approxOdds: "2.02%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 1,  minPoints: 17, oddsAtMin: "50.00%", notes: "40 applicants shut out below 17 pts" },
        nr_special:        { quota: 1,  minPoints: 17, oddsAtMin: "100%",   notes: "6 applicants shut out below 17 pts" },
        nr_random:         { quota: 0,  firstChoiceApplicants: 41,  approxOdds: null },
        nr_special_random: { quota: 0,  firstChoiceApplicants: 6,   approxOdds: null },
        resident:          { quota: 15, firstChoiceApplicants: 650, approxOdds: "2.31%" },
      },
    ],
  },

  "90": {
    typical: '160-175"', topEnd: '190"',
    trait: "Red Desert/Wind River transition.",
    description: "South of Lander. Focus: Sweetwater River drainage and Green Mountain. Sage/Timber mix.",
    coords: { lat: 42.9531, lng: -107.7987 },
    huntType: "1 — Any Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 4,  minPoints: 16, oddsAtMin: "28.57%", notes: "78 applicants shut out below 16 pts" },
        nr_special:        { quota: 3,  minPoints: 16, oddsAtMin: "100%",   notes: "33 applicants shut out below 16 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 81,  approxOdds: "1.23%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 33,  approxOdds: "3.03%" },
        resident:          { quota: 25, firstChoiceApplicants: 664, approxOdds: "3.77%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 3,  minPoints: 15, oddsAtMin: "100%",   notes: "86 applicants shut out below 15 pts" },
        nr_special:        { quota: 3,  minPoints: 14, oddsAtMin: "50.00%", notes: "22 applicants shut out below 14 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 86,  approxOdds: "1.16%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 24,  approxOdds: "4.17%" },
        resident:          { quota: 27, firstChoiceApplicants: 592, approxOdds: "4.56%" },
      },
    ],
  },

  // ── MID-TIER LIMITED QUOTA UNITS ─────────────────────────────────────────

  "034": {
    typical: '150-165"', topEnd: '178"',
    trait: "Laramie Range; quality-managed unit.",
    description: "Region Q — Laramie Range south of Douglas. Open pine and sage ridge country.",
    coords: { lat: 43.2053, lng: -106.7858 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 10, minPoints: 14, oddsAtMin: "33.33%", notes: "106 applicants shut out below 13 pts" },
        nr_special:        { quota: 7,  minPoints: 13, oddsAtMin: "50.00%", notes: "55 applicants shut out below 12 pts" },
        nr_random:         { quota: 3,  firstChoiceApplicants: 110, approxOdds: "2.73%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 59,  approxOdds: "3.39%" },
        resident:          { quota: 76, firstChoiceApplicants: 979, approxOdds: "7.76%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 9,  minPoints: 13, oddsAtMin: "16.67%", notes: "135 applicants shut out below 13 pts" },
        nr_special:        { quota: 6,  minPoints: 10, oddsAtMin: "25.00%", notes: "44 applicants shut out below 10 pts" },
        nr_random:         { quota: 2,  firstChoiceApplicants: 139, approxOdds: "1.44%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 47,  approxOdds: "4.26%" },
        resident:          { quota: 77, firstChoiceApplicants: 894, approxOdds: "8.61%" },
      },
    ],
  },

  "078": {
    typical: '150-165"', topEnd: '178"',
    trait: "Sierra Madre; spruce/sage mix; mid-tier draw unit.",
    description: "Region D — Sierra Madre foothills near Encampment. Spruce and sage mix.",
    coords: { lat: 41.1911, lng: -106.4473 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 21, minPoints: 7,  oddsAtMin: "100%",   notes: "94 applicants shut out below 7 pts" },
        nr_special:        { quota: 15, minPoints: 3,  oddsAtMin: "100%",   notes: "19 applicants shut out below 3 pts" },
        nr_random:         { quota: 7,  firstChoiceApplicants: 94,  approxOdds: "7.45%" },
        nr_special_random: { quota: 5,  firstChoiceApplicants: 19,  approxOdds: "26.32%" },
        resident:          { quota: 193, firstChoiceApplicants: 1091, approxOdds: "17.69%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 21, minPoints: 8,  oddsAtMin: "40.00%", notes: "117 applicants shut out below 8 pts" },
        nr_special:        { quota: 15, minPoints: 3,  oddsAtMin: "50.00%", notes: "5 applicants shut out at 0 pts" },
        nr_random:         { quota: 7,  firstChoiceApplicants: 119, approxOdds: "5.88%" },
        nr_special_random: { quota: 5,  firstChoiceApplicants: 9,   approxOdds: "55.56%" },
        resident:          { quota: 191, firstChoiceApplicants: 1031, approxOdds: "18.52%" },
      },
    ],
  },

  "081": {
    typical: '150-165"', topEnd: '178"',
    trait: "South-central WY desert; quality-managed unit.",
    description: "Region D — South-central WY near Rawlins. Open desert sage and rock.",
    coords: { lat: 41.0935, lng: -106.7152 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 16, minPoints: 11, oddsAtMin: "20.00%", notes: "112 applicants shut out below 10 pts" },
        nr_special:        { quota: 11, minPoints: 7,  oddsAtMin: "100%",   notes: "24 applicants shut out below 6 pts" },
        nr_random:         { quota: 5,  firstChoiceApplicants: 112, approxOdds: "4.46%" },
        nr_special_random: { quota: 3,  firstChoiceApplicants: 24,  approxOdds: "12.50%" },
        resident:          { quota: 132, firstChoiceApplicants: 560, approxOdds: "23.57%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 15, minPoints: 10, oddsAtMin: "50.00%", notes: "103 applicants shut out below 9 pts" },
        nr_special:        { quota: 11, minPoints: 6,  oddsAtMin: "75.00%", notes: "30 applicants shut out below 6 pts" },
        nr_random:         { quota: 5,  firstChoiceApplicants: 103, approxOdds: "4.85%" },
        nr_special_random: { quota: 3,  firstChoiceApplicants: 31,  approxOdds: "9.68%" },
        resident:          { quota: 134, firstChoiceApplicants: 572, approxOdds: "23.43%" },
      },
    ],
  },

  "125": {
    typical: '155-170"', topEnd: '183"',
    trait: "Wind River Range central; remote alpine basins.",
    description: "Region X — Wind River Range central near Dubois. Remote alpine basins and sage benches.",
    coords: { lat: 44.1288, lng: -108.3381 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 6,  minPoints: 13, oddsAtMin: "33.33%", notes: "58 applicants shut out below 13 pts" },
        nr_special:        { quota: 5,  minPoints: 4,  oddsAtMin: "66.67%", notes: "9 applicants shut out below 4 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 60,  approxOdds: "1.67%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 10,  approxOdds: "10.00%" },
        resident:          { quota: 46, firstChoiceApplicants: 296, approxOdds: "15.54%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 6,  minPoints: 11, oddsAtMin: "100%",   notes: "50 applicants shut out below 11 pts" },
        nr_special:        { quota: 4,  minPoints: 8,  oddsAtMin: "66.67%", notes: "11 applicants shut out below 8 pts" },
        nr_random:         { quota: 1,  firstChoiceApplicants: 50,  approxOdds: "2.00%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 11,  approxOdds: "9.09%" },
        resident:          { quota: 45, firstChoiceApplicants: 323, approxOdds: "13.93%" },
      },
    ],
  },

  "120": {
    typical: '148-163"', topEnd: '175"',
    trait: "Absaroka foothills; moderate draw odds.",
    description: "Region X — South Absaroka/Wind River near Dubois. Timbered ridges and open sage.",
    coords: { lat: 44.1288, lng: -108.3381 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 6,  minPoints: 7,  oddsAtMin: "50.00%", notes: "34 applicants shut out below 6 pts" },
        nr_special:        { quota: 5,  minPoints: 4,  oddsAtMin: "60.00%", notes: "8 applicants shut out below 3 pts" },
        nr_random:         { quota: 2,  firstChoiceApplicants: 34,  approxOdds: "5.88%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 8,   approxOdds: "12.50%" },
        resident:          { quota: 47, firstChoiceApplicants: 110, approxOdds: "42.73%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 6,  minPoints: 7,  oddsAtMin: "25.00%", notes: "27 applicants shut out below 7 pts" },
        nr_special:        { quota: 5,  minPoints: 2,  oddsAtMin: "66.67%", notes: "4 applicants shut out below 2 pts" },
        nr_random:         { quota: 2,  firstChoiceApplicants: 30,  approxOdds: "6.67%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 4,   approxOdds: "25.00%" },
        resident:          { quota: 45, firstChoiceApplicants: 101, approxOdds: "44.55%" },
      },
    ],
  },

  "036": {
    typical: '148-162"', topEnd: '172"',
    trait: "Owl Creek Mountains; steep sage and limestone.",
    description: "Region D — Owl Creek Mountains near Thermopolis. Steep sage and limestone terrain.",
    coords: { lat: 43.3152, lng: -107.7048 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 9,  minPoints: 5,  oddsAtMin: "25.00%", notes: "58 applicants shut out below 5 pts" },
        nr_special:        { quota: 6,  minPoints: 2,  oddsAtMin: "50.00%", notes: "8 applicants shut out below 2 pts" },
        nr_random:         { quota: 3,  firstChoiceApplicants: 61,  approxOdds: "4.92%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 8,   approxOdds: "25.00%" },
        resident:          { quota: 66, firstChoiceApplicants: 155, approxOdds: "42.58%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 7,  minPoints: 3,  oddsAtMin: "75.00%", notes: "30 applicants shut out below 3 pts" },
        nr_special:        { quota: 5,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 2,  firstChoiceApplicants: 31,  approxOdds: "6.45%" },
        nr_special_random: { quota: 1,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 49, firstChoiceApplicants: 136, approxOdds: "36.03%" },
      },
    ],
  },

  "022_1": {
    typical: '140-158"', topEnd: '170"',
    trait: "Powder River Basin; high mature buck ratio.",
    description: "Region B — N-central WY near Kaycee. Rolling sagebrush breaks and Powder River bottoms.",
    coords: { lat: 43.8813, lng: -104.5879 },
    huntType: "1 — Antlered Mule Deer",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 12, minPoints: 6,  oddsAtMin: "28.57%", notes: "143 applicants shut out below 6 pts" },
        nr_special:        { quota: 9,  minPoints: 2,  oddsAtMin: "25.00%", notes: "7 applicants shut out below 2 pts" },
        nr_random:         { quota: 4,  firstChoiceApplicants: 148, approxOdds: "2.70%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 10,  approxOdds: "20.00%" },
        resident:          { quota: 117, firstChoiceApplicants: 249, approxOdds: "47.19%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 12, minPoints: 5,  oddsAtMin: "50.00%", notes: "146 applicants shut out below 5 pts" },
        nr_special:        { quota: 9,  minPoints: 3,  oddsAtMin: "58.33%", notes: "11 applicants shut out below 3 pts" },
        nr_random:         { quota: 4,  firstChoiceApplicants: 147, approxOdds: "2.72%" },
        nr_special_random: { quota: 2,  firstChoiceApplicants: 11,  approxOdds: "18.18%" },
        resident:          { quota: 115, firstChoiceApplicants: 247, approxOdds: "46.56%" },
      },
    ],
  },

  // ── GENERAL REGIONS ───────────────────────────────────────────────────────

  "G": {
    typical: '170-185"', topEnd: '200"+',
    trait: "Wyoming Range premier region; Areas 135, 143-145; rugged vertical terrain.",
    description: "Region G — Wyoming Range West of Big Piney. Areas 135, 143, 144, 145. Extreme alpine and timber.",
    coords: { lat: 42.6542, lng: -110.8234 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 93,  minPoints: 10, oddsAtMin: "91.67%", notes: "923 applicants shut out below 10 pts" },
        nr_special:        { quota: 62,  minPoints: 6,  oddsAtMin: "44.44%", notes: "162 applicants shut out below 5 pts" },
        nr_random:         { quota: 30,  firstChoiceApplicants: 926, approxOdds: "3.24%" },
        nr_special_random: { quota: 20,  firstChoiceApplicants: 166, approxOdds: "12.05%" },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%", },
      },
      {
        year: 2024,
        nr_regular:        { quota: 96,  minPoints: 8,  oddsAtMin: "66.67%", notes: "722 applicants shut out below 7 pts" },
        nr_special:        { quota: 65,  minPoints: 4,  oddsAtMin: "25.00%", notes: "79 applicants shut out below 4 pts" },
        nr_random:         { quota: 31,  firstChoiceApplicants: 725, approxOdds: "4.28%" },
        nr_special_random: { quota: 21,  firstChoiceApplicants: 88,  approxOdds: "23.86%" },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "H": {
    typical: '158-175"', topEnd: '200"+',
    trait: "Wyoming/Snake River Range; G&H among WY best general regions.",
    description: "Region H — Wyoming Range and Snake River Range. Areas 138-156. Post-2022 winter recovery underway.",
    coords: { lat: 43.2000, lng: -110.2000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 154, minPoints: 6,  oddsAtMin: "6.94%",  notes: "648 applicants shut out below 6 pts" },
        nr_special:        { quota: 104, minPoints: 4,  oddsAtMin: "46.34%", notes: "150 applicants shut out below 4 pts" },
        nr_random:         { quota: 51,  firstChoiceApplicants: 714, approxOdds: "7.14%" },
        nr_special_random: { quota: 34,  firstChoiceApplicants: 171, approxOdds: "19.88%" },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 151, minPoints: 5,  oddsAtMin: "58.49%", notes: "490 applicants shut out below 5 pts" },
        nr_special:        { quota: 101, minPoints: 3,  oddsAtMin: "93.75%", notes: "66 applicants shut out below 3 pts" },
        nr_random:         { quota: 50,  firstChoiceApplicants: 512, approxOdds: "9.77%" },
        nr_special_random: { quota: 33,  firstChoiceApplicants: 67,  approxOdds: "49.25%" },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "W": {
    typical: '150-168"', topEnd: '180"',
    trait: "High desert genetics adjacent to top-tier Units 87 and 102.",
    description: "Region W — Baggs/Red Desert. Areas 82, 84, 100, 131. Adjacent to top-tier units.",
    coords: { lat: 41.5000, lng: -107.8000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 393, minPoints: 1,  oddsAtMin: "81.37%", notes: "379 applicants at 0 pts drew 0%" },
        nr_special:        { quota: 179, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 130, firstChoiceApplicants: 398, approxOdds: "32.66%" },
        nr_special_random: { quota: 59,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 410, minPoints: 0,  oddsAtMin: "28.44%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 179, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 136, firstChoiceApplicants: 161, approxOdds: "84.47%" },
        nr_special_random: { quota: 59,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "B": {
    typical: '140-160"', topEnd: '175"',
    trait: "Powder River Basin; high mature buck ratios; limited public access.",
    description: "Region B — Powder River Basin near Kaycee/Douglas. High mature buck ratio but mostly private.",
    coords: { lat: 43.7000, lng: -104.8000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 558, minPoints: 0,  oddsAtMin: "1.81%",  notes: "VERY low odds at 0 pts; 496 competing for 9 tags" },
        nr_special:        { quota: 240, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 186, firstChoiceApplicants: 487, approxOdds: "38.19%" },
        nr_special_random: { quota: 79,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 559, minPoints: 0,  oddsAtMin: "18.16%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 240, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 186, firstChoiceApplicants: 401, approxOdds: "46.38%" },
        nr_special_random: { quota: 79,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "C": {
    typical: '150-165"', topEnd: '178"',
    trait: "Bighorn Basin foothills; outfitters report 150-165\" typical.",
    description: "Region C — Bighorn Basin/Foothills near Sheridan/Buffalo/Worland.",
    coords: { lat: 44.3000, lng: -106.5000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 1078, minPoints: 1,  oddsAtMin: "67.74%", notes: "773 applicants at 0 pts drew 0%" },
        nr_special:        { quota: 535,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 359,  firstChoiceApplicants: 821, approxOdds: "43.73%" },
        nr_special_random: { quota: 178,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 1190, minPoints: 0,  oddsAtMin: "25.59%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 594,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 396,  firstChoiceApplicants: 445, approxOdds: "88.99%" },
        nr_special_random: { quota: 198,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "Y": {
    typical: '150-165"', topEnd: '180"',
    trait: "Bighorn Basin; outfitters report consistent 150-165\" mature bucks.",
    description: "Region Y — Bighorn Basin. Areas 24-25, 27-28, 30, 32-33, 163, 169.",
    coords: { lat: 44.2000, lng: -107.2000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 661, minPoints: 1,  oddsAtMin: "57.14%", notes: "681 applicants at 0 pts drew 0%" },
        nr_special:        { quota: 296, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 220, firstChoiceApplicants: 810, approxOdds: "27.16%" },
        nr_special_random: { quota: 98,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 771, minPoints: 0,  oddsAtMin: "10.68%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 355, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 257, firstChoiceApplicants: 408, approxOdds: "62.99%" },
        nr_special_random: { quota: 118, firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "R": {
    typical: '155-172"', topEnd: '185"',
    trait: "Bighorn Mountains; strong genetics; top-end 185\"+ possible.",
    description: "Region R — Bighorn Mountains. Areas 41, 46-47, 50-53.",
    coords: { lat: 44.4000, lng: -107.6000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 282, minPoints: 3,  oddsAtMin: "52.81%", notes: "420 applicants shut out below 2 pts" },
        nr_special:        { quota: 148, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 94,  firstChoiceApplicants: 462, approxOdds: "20.35%" },
        nr_special_random: { quota: 49,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 297, minPoints: 2,  oddsAtMin: "27.45%", notes: "354 applicants shut out below 2 pts" },
        nr_special:        { quota: 148, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 99,  firstChoiceApplicants: 426, approxOdds: "23.24%" },
        nr_special_random: { quota: 49,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "X": {
    typical: '153-170"', topEnd: '183"',
    trait: "Absaroka/Wind River; remote; lower hunter pressure.",
    description: "Region X — Absaroka and Wind River Range. Areas 121-125, 127, 165.",
    coords: { lat: 44.3000, lng: -108.7000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 64,  minPoints: 0,  oddsAtMin: "2.13%",  notes: "94 applicants at 0 pts; only 2.13% drew" },
        nr_special:        { quota: 30,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 21,  firstChoiceApplicants: 92,  approxOdds: "22.83%" },
        nr_special_random: { quota: 9,   firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 69,  minPoints: 0,  oddsAtMin: "35.65%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 30,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 22,  firstChoiceApplicants: 71,  approxOdds: "30.99%" },
        nr_special_random: { quota: 9,   firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "L": {
    typical: '155-172"', topEnd: '185"',
    trait: "Wind River/Pinedale; strong Wind River genetics.",
    description: "Region L — Wind River Range and Pinedale area. Areas 92, 94, 148, 157, 160, 171.",
    coords: { lat: 43.0000, lng: -109.5000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 105, minPoints: 2,  oddsAtMin: "81.25%", notes: "185 applicants shut out below 2 pts" },
        nr_special:        { quota: 58,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 34,  firstChoiceApplicants: 194, approxOdds: "17.53%" },
        nr_special_random: { quota: 19,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 114, minPoints: 1,  oddsAtMin: "54.35%", notes: "120 applicants shut out below 1 pt" },
        nr_special:        { quota: 59,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 38,  firstChoiceApplicants: 141, approxOdds: "26.95%" },
        nr_special_random: { quota: 19,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "K": {
    typical: '155-170"', topEnd: '185"',
    trait: "Overthrust Belt; western WY genetics; 185\"+ possible.",
    description: "Region K — Overthrust Belt/Kemmerer. Areas 132-134, 168.",
    coords: { lat: 41.5000, lng: -110.3000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 95,  minPoints: 4,  oddsAtMin: "81.25%", notes: "291 applicants shut out below 4 pts" },
        nr_special:        { quota: 57,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 31,  firstChoiceApplicants: 297, approxOdds: "10.44%" },
        nr_special_random: { quota: 19,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 92,  minPoints: 3,  oddsAtMin: "57.14%", notes: "139 applicants shut out below 3 pts" },
        nr_special:        { quota: 54,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 30,  firstChoiceApplicants: 156, approxOdds: "19.23%" },
        nr_special_random: { quota: 18,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "D": {
    typical: '140-165"', topEnd: '178"',
    trait: "Laramie Range/Sierra Madre; mid-tier region.",
    description: "Region D — Laramie Range, Sierra Madre. Areas 66, 70, 74-81, 88.",
    coords: { lat: 41.8000, lng: -106.4000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 164, minPoints: 3,  oddsAtMin: "96.30%", notes: "329 applicants shut out below 3 pts" },
        nr_special:        { quota: 85,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 54,  firstChoiceApplicants: 332, approxOdds: "16.27%" },
        nr_special_random: { quota: 28,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 182, minPoints: 2,  oddsAtMin: "62.30%", notes: "237 applicants shut out below 2 pts" },
        nr_special:        { quota: 87,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 60,  firstChoiceApplicants: 260, approxOdds: "23.08%" },
        nr_special_random: { quota: 28,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "F": {
    typical: '150-168"', topEnd: '183"',
    trait: "Absaroka/Shoshone NF; remote timbered terrain.",
    description: "Region F — Absaroka Range near Cody. Areas 106, 109, 111, 113-115.",
    coords: { lat: 44.5000, lng: -109.5000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 372, minPoints: 0,  oddsAtMin: "6.95%",  notes: "331 applicants at 0 pts; only 6.95% drew" },
        nr_special:        { quota: 164, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 123, firstChoiceApplicants: 307, approxOdds: "40.07%" },
        nr_special_random: { quota: 54,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 366, minPoints: 0,  oddsAtMin: "28.53%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 162, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 121, firstChoiceApplicants: 232, approxOdds: "52.16%" },
        nr_special_random: { quota: 54,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "A": {
    typical: '130-155"', topEnd: '170"+',
    trait: "Black Hills/Northeast WY; mixed mule/whitetail.",
    description: "Region A — NE WY near Hulett/Devils Tower. Areas 1-6.",
    coords: { lat: 44.5000, lng: -104.4000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 1250, minPoints: 0, oddsAtMin: "15.80%", notes: "1,576 applicants at 0 pts; 15.8% drew" },
        nr_special:        { quota: 588,  minPoints: 0, oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 416,  firstChoiceApplicants: 1324, approxOdds: "31.42%" },
        nr_special_random: { quota: 196,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 1255, minPoints: 0, oddsAtMin: "29.17%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 588,  minPoints: 0, oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 418,  firstChoiceApplicants: 1009, approxOdds: "41.43%" },
        nr_special_random: { quota: 195,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "J": {
    typical: '145-165"', topEnd: '178"',
    trait: "Laramie Range/Platte Valley; good access.",
    description: "Region J — Laramie Range and Platte Valley. Areas 59, 61, 64, 65.",
    coords: { lat: 41.8000, lng: -105.4000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 477, minPoints: 0,  oddsAtMin: "74.40%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 217, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 158, firstChoiceApplicants: 104, approxOdds: "100%", },
        nr_special_random: { quota: 0,   firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 480, minPoints: 0,  oddsAtMin: "66.07%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 217, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 159, firstChoiceApplicants: 171, approxOdds: "92.98%" },
        nr_special_random: { quota: 0,   firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "M": {
    typical: '148-165"', topEnd: '180"',
    trait: "Bighorn Basin/Wind River; mid-tier; 178\"+ possible.",
    description: "Region M — Bighorn Basin and Wind River. Areas 35-37, 39-40, 164.",
    coords: { lat: 43.5000, lng: -107.8000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 267, minPoints: 1,  oddsAtMin: "32.67%", notes: "253 applicants at 0 pts drew 0%" },
        nr_special:        { quota: 117, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 89,  firstChoiceApplicants: 320, approxOdds: "27.81%" },
        nr_special_random: { quota: 39,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 267, minPoints: 0,  oddsAtMin: "15.25%", notes: "Can draw at 0 pts" },
        nr_special:        { quota: 117, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 89,  firstChoiceApplicants: 200, approxOdds: "44.50%" },
        nr_special_random: { quota: 39,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "Q": {
    typical: '148-165"', topEnd: '178"',
    trait: "Rawlins/Carbon County; adjacent to top-tier Units 87 and 89.",
    description: "Region Q — Carbon County near Rawlins. Areas 34, 96-98.",
    coords: { lat: 42.2000, lng: -107.5000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 1", close: "October 31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 37,  minPoints: 3,  oddsAtMin: "5.88%",  notes: "127 applicants shut out below 2 pts" },
        nr_special:        { quota: 21,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 12,  firstChoiceApplicants: 138, approxOdds: "8.70%" },
        nr_special_random: { quota: 6,   firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 35,  minPoints: 2,  oddsAtMin: "88.89%", notes: "95 applicants shut out below 2 pts" },
        nr_special:        { quota: 21,  minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 11,  firstChoiceApplicants: 95,  approxOdds: "11.58%" },
        nr_special_random: { quota: 7,   firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

  "T": {
    typical: '145-165"', topEnd: '178"',
    trait: "SE WY/Wheatland; Cross C Ranch managed hunts produce 155-170\".",
    description: "Region T — SE Wyoming near Wheatland/Cheyenne. Area 15.",
    coords: { lat: 41.9000, lng: -104.5000 },
    huntType: "General Region Tag",
    seasons: {
      archery: { open: "September 1", close: "September 30" },
      rifle: { open: "October 20", close: "October 31", notes: "Season dates Oct 20-31" },
    },
    drawHistory: [
      {
        year: 2025,
        nr_regular:        { quota: 295, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_special:        { quota: 120, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 98,  firstChoiceApplicants: 0,   approxOdds: null },
        nr_special_random: { quota: 39,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
      {
        year: 2024,
        nr_regular:        { quota: 287, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_special:        { quota: 119, minPoints: 0,  oddsAtMin: "100%",   notes: "Can draw at 0 pts" },
        nr_random:         { quota: 95,  firstChoiceApplicants: 0,   approxOdds: null },
        nr_special_random: { quota: 39,  firstChoiceApplicants: 0,   approxOdds: null },
        resident:          { quota: 9999, firstChoiceApplicants: 0,  approxOdds: "100%" },
      },
    ],
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// DRAW TREND ANALYSIS PROMPT HELPER
// Pass this to the AI when asking for trend analysis
// ─────────────────────────────────────────────────────────────────────────────
export function buildDrawTrendBlock(unit: WyomingDeerUnit, unitName: string, residency: string): string {
  const isResident = residency.toLowerCase().includes('resident');
  let block = `DRAW HISTORY FOR UNIT ${unitName}:\n`;

  for (const year of unit.drawHistory) {
    block += `\n--- ${year.year} ---\n`;
    if (isResident) {
      block += `RESIDENT: Quota=${year.resident.quota}, First-Choice Applicants=${year.resident.firstChoiceApplicants}, Odds=${year.resident.approxOdds ?? 'N/A'}\n`;
    } else {
      block += `NR REGULAR: Quota=${year.nr_regular.quota}, Min Points=${year.nr_regular.minPoints ?? 'N/A'}, Odds at Min=${year.nr_regular.oddsAtMin ?? 'N/A'}${year.nr_regular.notes ? ' | ' + year.nr_regular.notes : ''}\n`;
      block += `NR SPECIAL: Quota=${year.nr_special.quota}, Min Points=${year.nr_special.minPoints ?? 'N/A'}, Odds at Min=${year.nr_special.oddsAtMin ?? 'N/A'}\n`;
      block += `NR RANDOM: Quota=${year.nr_random.quota}, First-Choice Applicants=${year.nr_random.firstChoiceApplicants}, Odds=${year.nr_random.approxOdds ?? 'N/A'}\n`;
      block += `NR SPECIAL RANDOM: Quota=${year.nr_special_random.quota}, First-Choice Applicants=${year.nr_special_random.firstChoiceApplicants}, Odds=${year.nr_special_random.approxOdds ?? 'N/A'}\n`;
    }
  }

  block += `\nBASED ON THIS 2-YEAR TREND, provide a brief prediction for the 2026 draw cycle. Note any trend in minimum points required, quota changes, or applicant pressure changes. Keep to 2-3 sentences.\n`;

  return block;
}