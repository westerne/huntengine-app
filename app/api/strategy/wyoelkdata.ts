// Wyoming Elk Draw Data
// NR pools: Regular (points-based), Special (points-based), Random (zero points), Special Random
// Resident: pure random draw — no points system
// Sources: 2024 WY G&F Demand Reports (NR Preference Point, NR Special, NR Random, NR Special Random, Resident)
// Key format: '{unit}-{huntType}' e.g. '7-1' = Unit 7, Type 1 (Any Elk rifle)
// Hunt Types: 1=Any Elk, 2=Antlered Five-Point, 3=Any Elk (alt season/spike), 4=Antlerless, 5=Antlerless (alt), 9=Archery

export type ElkDrawHistory = {
  year: number;
  resident: {
    quota: number;
    firstChoiceApplicants: number;
    approxOdds: string;
  };
  nr_regular: {
    quota: number;
    minPoints: number | null;
    oddsAtMin: string | null;
    notes?: string;
  };
  nr_special: {
    quota: number;
    minPoints: number | null;
    oddsAtMin: string | null;
  };
  nr_random: {
    quota: number;
    firstChoiceApplicants: number;
    approxOdds: string | null;
  };
  nr_special_random: {
    quota: number;
    firstChoiceApplicants: number;
    approxOdds: string | null;
  };
};

export type WyoElkUnit = {
  unit: string;
  huntType: string;
  huntTypeLabel: string; // e.g. "Any Elk - Rifle", "Antlerless", "Any Elk - Archery"
  typical: string;
  topEnd: string;
  trait: string;
  description: string;
  tier: 'trophy' | 'mid' | 'accessible' | 'general' | 'antlerless';
  coords?: { lat: number; lng: number };
  drawHistory: ElkDrawHistory[];
};

export const WYOMING_ELK_UNITS: Record<string, WyoElkUnit> = {

  // ════════════════════════════════════════════════════════
  // UNIT 1
  // ════════════════════════════════════════════════════════

  '1-1': {
    unit: '1', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Southeast Wyoming plains/timber transition',
    description: 'Southeast Wyoming near Laramie Peak foothills. Limited NR quota with high point requirements. Strong resident demand.',
    tier: 'mid',
    coords: { lat: 42.7, lng: -105.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 83, firstChoiceApplicants: 942, approxOdds: '8.81%' },
        nr_regular: { quota: 5, minPoints: 15, oddsAtMin: '50.0%', notes: 'Draws at 16pts 100%, clears at 15pts 50%' },
        nr_special: { quota: 3, minPoints: 14, oddsAtMin: '66.67%' },
        nr_random: { quota: 1, firstChoiceApplicants: 243, approxOdds: '0.41%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 76, approxOdds: '1.32%' },
      },
    ],
  },

  '1-4': {
    unit: '1', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 1 antlerless elk. Moderate NR demand, reasonable odds.',
    tier: 'antlerless',
    coords: { lat: 42.7, lng: -105.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 92, approxOdds: '68.48%' },
        nr_regular: { quota: 7, minPoints: 1, oddsAtMin: '58.33%' },
        nr_special: { quota: 4, minPoints: 1, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 19, approxOdds: '10.53%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 6
  // ════════════════════════════════════════════════════════

  '6-1': {
    unit: '6', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Southeast Wyoming, moderate terrain',
    description: 'Small quota unit in southeast Wyoming. High point requirements for NR regular pool.',
    tier: 'mid',
    coords: { lat: 42.5, lng: -105.4 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 40, firstChoiceApplicants: 368, approxOdds: '10.87%' },
        nr_regular: { quota: 3, minPoints: 10, oddsAtMin: '50.0%' },
        nr_special: { quota: 2, minPoints: 4, oddsAtMin: '33.33%' },
        nr_random: { quota: 0, firstChoiceApplicants: 66, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 8, approxOdds: null },
      },
    ],
  },

  '6-4': {
    unit: '6', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 6 antlerless elk. Very low NR demand.',
    tier: 'antlerless',
    coords: { lat: 42.5, lng: -105.4 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 37, approxOdds: '56.76%' },
        nr_regular: { quota: 3, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 2, approxOdds: '50.0%' },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 7 — Laramie Peak
  // ════════════════════════════════════════════════════════

  '7-1': {
    unit: '7', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '320-350"', topEnd: '380"+',
    trait: 'Laramie Peak giants — one of Wyoming\'s most coveted elk units',
    description: 'Southeast Wyoming, Laramie Mountains. Mix of timber, meadows, and broken terrain. Strong resident population with consistent trophy bulls. High NR demand in all pools.',
    tier: 'trophy',
    coords: { lat: 42.25, lng: -105.75 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 1003, firstChoiceApplicants: 3669, approxOdds: '27.34%' },
        nr_regular: { quota: 72, minPoints: 13, oddsAtMin: '57.58%' },
        nr_special: { quota: 48, minPoints: 12, oddsAtMin: '33.33%' },
        nr_random: { quota: 24, firstChoiceApplicants: 1107, approxOdds: '2.17%' },
        nr_special_random: { quota: 16, firstChoiceApplicants: 332, approxOdds: '4.82%' },
      },
    ],
  },

  '7-2': {
    unit: '7', huntType: '2', huntTypeLabel: 'Antlered Five-Point - Rifle',
    typical: '300-330"', topEnd: '360"+',
    trait: 'Five-point restriction — quality bull management',
    description: 'Unit 7 five-point antlered tag. Significant NR demand. Draws at 1 point in regular pool historically.',
    tier: 'mid',
    coords: { lat: 42.25, lng: -105.75 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 294, firstChoiceApplicants: 69, approxOdds: '100%' },
        nr_regular: { quota: 29, minPoints: 1, oddsAtMin: '30.0%' },
        nr_special: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 9, firstChoiceApplicants: 29, approxOdds: '31.03%' },
        nr_special_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '7-4': {
    unit: '7', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'High quota antlerless — very drawable',
    description: 'Unit 7 antlerless elk. Massive quota with low NR demand. Essentially guaranteed for NR hunters with zero points.',
    tier: 'antlerless',
    coords: { lat: 42.25, lng: -105.75 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 672, firstChoiceApplicants: 30, approxOdds: '100%' },
        nr_regular: { quota: 92, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 39, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 30, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 13, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 8
  // ════════════════════════════════════════════════════════

  '8-1': {
    unit: '8', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Southeast Wyoming, moderate demand',
    description: 'Southeast Wyoming. Moderate NR quota with mid-range point requirements.',
    tier: 'mid',
    coords: { lat: 42.6, lng: -105.9 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 117, firstChoiceApplicants: 168, approxOdds: '69.64%' },
        nr_regular: { quota: 12, minPoints: 1, oddsAtMin: '40.0%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 21, approxOdds: '14.29%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 11
  // ════════════════════════════════════════════════════════

  '11-1': {
    unit: '11', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Bighorn Mountains — solid bull numbers, high resident demand',
    description: 'North-central Wyoming, Bighorn Mountains. Strong resident demand. NR regular pool draws at 11 points.',
    tier: 'mid',
    coords: { lat: 44.1, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 150, firstChoiceApplicants: 913, approxOdds: '16.43%' },
        nr_regular: { quota: 10, minPoints: 11, oddsAtMin: '40.0%' },
        nr_special: { quota: 8, minPoints: 12, oddsAtMin: '50.0%' },
        nr_random: { quota: 3, firstChoiceApplicants: 124, approxOdds: '2.42%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 48, approxOdds: '4.17%' },
      },
    ],
  },

  '11-4': {
    unit: '11', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 11 antlerless elk. Low NR demand, very drawable.',
    tier: 'antlerless',
    coords: { lat: 44.1, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 45, approxOdds: '100%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '68.75%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 5, approxOdds: '60.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '11-9': {
    unit: '11', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Archery tag — Bighorn Mountains',
    description: 'Unit 11 archery elk. Draws at 11 points in regular pool. Good archery terrain.',
    tier: 'mid',
    coords: { lat: 44.1, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 62, firstChoiceApplicants: 145, approxOdds: '42.76%' },
        nr_regular: { quota: 6, minPoints: 11, oddsAtMin: '100%' },
        nr_special: { quota: 4, minPoints: 6, oddsAtMin: '33.33%' },
        nr_random: { quota: 1, firstChoiceApplicants: 44, approxOdds: '2.27%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 9, approxOdds: '11.11%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 16 — Sunlight Basin / Clarks Fork
  // ════════════════════════════════════════════════════════

  '16-1': {
    unit: '16', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '330-360"', topEnd: '390"+',
    trait: 'Sunlight Basin and Clarks Fork — trophy bull country',
    description: 'Northwest Wyoming, Sunlight Basin and Clarks Fork drainage. High alpine terrain with large bull populations. Premium trophy unit with brutal NR draw odds.',
    tier: 'trophy',
    coords: { lat: 44.6, lng: -109.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 189, firstChoiceApplicants: 1818, approxOdds: '10.40%' },
        nr_regular: { quota: 12, minPoints: 16, oddsAtMin: '100%', notes: 'Clears at 16, oversubscribed at 15 and below' },
        nr_special: { quota: 9, minPoints: 14, oddsAtMin: '33.33%' },
        nr_random: { quota: 3, firstChoiceApplicants: 353, approxOdds: '0.85%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 137, approxOdds: '1.46%' },
      },
    ],
  },

  '16-2': {
    unit: '16', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '310-340"', topEnd: '370"+',
    trait: 'Sunlight Basin Type 2 tag — extremely high point requirement',
    description: 'Unit 16 Type 2 any elk. One of the hardest NR draws in Wyoming — requires 17+ points in regular pool.',
    tier: 'trophy',
    coords: { lat: 44.6, lng: -109.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 74, firstChoiceApplicants: 722, approxOdds: '10.25%' },
        nr_regular: { quota: 6, minPoints: 17, oddsAtMin: '100%' },
        nr_special: { quota: 5, minPoints: 16, oddsAtMin: '57.14%' },
        nr_random: { quota: 1, firstChoiceApplicants: 185, approxOdds: '0.54%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 57, approxOdds: '1.75%' },
      },
    ],
  },

  '16-4': {
    unit: '16', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 16 antlerless elk. Very drawable with zero points — good opportunity.',
    tier: 'antlerless',
    coords: { lat: 44.6, lng: -109.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 250, firstChoiceApplicants: 254, approxOdds: '98.43%' },
        nr_regular: { quota: 30, minPoints: 0, oddsAtMin: '24.24%' },
        nr_special: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 10, firstChoiceApplicants: 33, approxOdds: '30.30%' },
        nr_special_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 19
  // ════════════════════════════════════════════════════════

  '19-1': {
    unit: '19', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'North Absaroka foothills — quality elk country',
    description: 'Northwest Wyoming, north Absaroka foothills. Solid bull numbers. Draws at 11 points in regular pool.',
    tier: 'mid',
    coords: { lat: 44.8, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 104, firstChoiceApplicants: 484, approxOdds: '21.49%' },
        nr_regular: { quota: 9, minPoints: 11, oddsAtMin: '20.0%' },
        nr_special: { quota: 6, minPoints: 10, oddsAtMin: '25.0%' },
        nr_random: { quota: 3, firstChoiceApplicants: 125, approxOdds: '2.40%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 26, approxOdds: '7.69%' },
      },
    ],
  },

  '19-2': {
    unit: '19', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '290-320"', topEnd: '350"+',
    trait: 'North Absaroka Type 2 — draws at 11 special points',
    description: 'Unit 19 Type 2 any elk. Draws at 11 points in regular, 11 in special pool.',
    tier: 'mid',
    coords: { lat: 44.8, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 139, firstChoiceApplicants: 349, approxOdds: '39.83%' },
        nr_regular: { quota: 12, minPoints: 11, oddsAtMin: '66.67%' },
        nr_special: { quota: 9, minPoints: 11, oddsAtMin: '57.14%' },
        nr_random: { quota: 3, firstChoiceApplicants: 108, approxOdds: '2.78%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 43, approxOdds: '4.65%' },
      },
    ],
  },

  '19-4': {
    unit: '19', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 19 antlerless elk. Zero NR demand — essentially guaranteed.',
    tier: 'antlerless',
    coords: { lat: 44.8, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 106, firstChoiceApplicants: 10, approxOdds: '100%' },
        nr_regular: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '19-5': {
    unit: '19', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag (Type 5)',
    description: 'Unit 19 Type 5 antlerless elk. Very low demand, very drawable.',
    tier: 'antlerless',
    coords: { lat: 44.8, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 118, firstChoiceApplicants: 11, approxOdds: '100%' },
        nr_regular: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 22 — Bighorn Mountains Core
  // ════════════════════════════════════════════════════════

  '22-1': {
    unit: '22', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '310-340"', topEnd: '370"+',
    trait: 'Bighorn Mountains core — demanding high country hunt',
    description: 'North-central Wyoming, Bighorn Mountains. Rugged high-country terrain. Consistent trophy bulls but very limited NR quota and high point requirements.',
    tier: 'trophy',
    coords: { lat: 44.3, lng: -107.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 57, firstChoiceApplicants: 605, approxOdds: '9.42%' },
        nr_regular: { quota: 4, minPoints: 18, oddsAtMin: '36.36%' },
        nr_special: { quota: 3, minPoints: 18, oddsAtMin: '75.0%' },
        nr_random: { quota: 1, firstChoiceApplicants: 201, approxOdds: '0.50%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 19, approxOdds: '5.26%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 23
  // ════════════════════════════════════════════════════════

  '23-1': {
    unit: '23', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Greybull River area — mid-demand unit',
    description: 'North-central Wyoming. Draws at 12 points in regular pool. Moderate NR demand.',
    tier: 'mid',
    coords: { lat: 44.5, lng: -108.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 115, firstChoiceApplicants: 535, approxOdds: '21.50%' },
        nr_regular: { quota: 10, minPoints: 12, oddsAtMin: '22.22%' },
        nr_special: { quota: 8, minPoints: 11, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 126, approxOdds: '2.38%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 43, approxOdds: '4.65%' },
      },
    ],
  },

  '23-4': {
    unit: '23', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 23 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 44.5, lng: -108.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 178, firstChoiceApplicants: 8, approxOdds: '100%' },
        nr_regular: { quota: 24, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 10, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 8, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 24
  // ════════════════════════════════════════════════════════

  '24-1': {
    unit: '24', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Bighorn Basin foothills — high NR demand',
    description: 'North-central Wyoming, Bighorn Basin foothills. Draws at 16 points in regular pool. Very competitive.',
    tier: 'mid',
    coords: { lat: 44.6, lng: -108.0 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 155, firstChoiceApplicants: 1071, approxOdds: '14.47%' },
        nr_regular: { quota: 9, minPoints: 16, oddsAtMin: '57.14%' },
        nr_special: { quota: 6, minPoints: 14, oddsAtMin: '33.33%' },
        nr_random: { quota: 2, firstChoiceApplicants: 186, approxOdds: '1.08%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 61, approxOdds: '3.28%' },
      },
    ],
  },

  '24-4': {
    unit: '24', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 24 antlerless elk. Low demand, very drawable.',
    tier: 'antlerless',
    coords: { lat: 44.6, lng: -108.0 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 73, approxOdds: '86.30%' },
        nr_regular: { quota: 9, minPoints: 1, oddsAtMin: '75.0%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 5, approxOdds: '40.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '24-5': {
    unit: '24', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag (Type 5)',
    description: 'Unit 24 Type 5 antlerless elk. Low demand.',
    tier: 'antlerless',
    coords: { lat: 44.6, lng: -108.0 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 147, firstChoiceApplicants: 110, approxOdds: '100%' },
        nr_regular: { quota: 21, minPoints: 0, oddsAtMin: '83.33%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 3, approxOdds: '100%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 25
  // ════════════════════════════════════════════════════════

  '25-1': {
    unit: '25', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Bighorn Basin north — high NR demand, tough draw',
    description: 'North-central Wyoming. Draws at 13 points in regular pool. Competitive NR unit.',
    tier: 'mid',
    coords: { lat: 44.75, lng: -108.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 141, firstChoiceApplicants: 771, approxOdds: '18.29%' },
        nr_regular: { quota: 14, minPoints: 13, oddsAtMin: '50.0%' },
        nr_special: { quota: 9, minPoints: 11, oddsAtMin: '50.0%' },
        nr_random: { quota: 4, firstChoiceApplicants: 175, approxOdds: '2.29%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 35, approxOdds: '8.57%' },
      },
    ],
  },

  '25-4': {
    unit: '25', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 25 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 44.75, lng: -108.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 42, approxOdds: '100%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '75.0%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 2, approxOdds: '100%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '25-5': {
    unit: '25', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag (Type 5)',
    description: 'Unit 25 Type 5 antlerless elk.',
    tier: 'antlerless',
    coords: { lat: 44.75, lng: -108.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 10, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 27, 28
  // ════════════════════════════════════════════════════════

  '27-4': {
    unit: '27', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 27 antlerless elk. Zero NR demand — guaranteed draw.',
    tier: 'antlerless',
    coords: { lat: 44.9, lng: -108.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 59, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 0, oddsAtMin: '88.89%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 1, approxOdds: '100%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '28-4': {
    unit: '28', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 28 antlerless elk. Very low NR demand, drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 44.95, lng: -108.0 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 147, firstChoiceApplicants: 178, approxOdds: '82.58%' },
        nr_regular: { quota: 21, minPoints: 0, oddsAtMin: '80.0%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 3, approxOdds: '100%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 30 — South Fork / Thorofare
  // ════════════════════════════════════════════════════════

  '30-1': {
    unit: '30', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '320-350"', topEnd: '375"+',
    trait: 'South Fork and Thorofare — true wilderness elk',
    description: 'Northwest Wyoming, South Fork of the Shoshone and Thorofare country. One of the most remote elk hunts in the lower 48. Zero NR random quota — serious points build required.',
    tier: 'trophy',
    coords: { lat: 44.0, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 24, firstChoiceApplicants: 600, approxOdds: '4.0%' },
        nr_regular: { quota: 3, minPoints: 18, oddsAtMin: '50.0%' },
        nr_special: { quota: 3, minPoints: 17, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 161, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 68, approxOdds: null },
      },
    ],
  },

  '30-4': {
    unit: '30', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 30 antlerless elk. Very low NR demand.',
    tier: 'antlerless',
    coords: { lat: 44.0, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 139, approxOdds: '60.43%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '50.0%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 2, approxOdds: '100%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 31 — North Fork Shoshone
  // ════════════════════════════════════════════════════════

  '31-1': {
    unit: '31', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '320-355"', topEnd: '380"+',
    trait: 'North Fork Shoshone — premium Cody-area trophy unit',
    description: 'Northwest Wyoming, North Fork of the Shoshone River. Classic Cody-area elk country. High demand, zero NR random quota. One of Wyoming\'s most coveted resident draws.',
    tier: 'trophy',
    coords: { lat: 44.45, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 40, firstChoiceApplicants: 1096, approxOdds: '3.65%' },
        nr_regular: { quota: 0, minPoints: null, oddsAtMin: null, notes: 'No NR quota issued — entire quota went to residents or was unfilled' },
        nr_special: { quota: 1, minPoints: 18, oddsAtMin: '25.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 118, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 23, approxOdds: null },
      },
    ],
  },

  '31-4': {
    unit: '31', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 31 antlerless elk. Moderate NR demand.',
    tier: 'antlerless',
    coords: { lat: 44.45, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 147, firstChoiceApplicants: 253, approxOdds: '58.10%' },
        nr_regular: { quota: 20, minPoints: 2, oddsAtMin: '33.33%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 38, approxOdds: '15.79%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 32
  // ════════════════════════════════════════════════════════

  '32-1': {
    unit: '32', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '300-330"', topEnd: '360"+',
    trait: 'Cody area — high resident demand, tough NR draw',
    description: 'Northwest Wyoming near Cody. High resident demand. NR regular pool draws at 18 points.',
    tier: 'trophy',
    coords: { lat: 44.5, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 31, firstChoiceApplicants: 626, approxOdds: '4.95%' },
        nr_regular: { quota: 2, minPoints: 18, oddsAtMin: '66.67%' },
        nr_special: { quota: 2, minPoints: 18, oddsAtMin: '50.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 53, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 16, approxOdds: null },
      },
    ],
  },

  '32-4': {
    unit: '32', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 32 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 44.5, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 151, approxOdds: '83.44%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '60.0%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 6, approxOdds: '83.33%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '32-9': {
    unit: '32', huntType: '9', huntTypeLabel: 'Antlerless - Archery',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless archery tag',
    description: 'Unit 32 antlerless archery elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 44.5, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 1, approxOdds: '100%' },
        nr_regular: { quota: 3, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 33
  // ════════════════════════════════════════════════════════

  '33-1': {
    unit: '33', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Greybull River north — moderate demand',
    description: 'North-central Wyoming. Draws at 6 points in regular pool — accessible for moderate-point NR hunters.',
    tier: 'accessible',
    coords: { lat: 44.6, lng: -108.7 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 163, firstChoiceApplicants: 141, approxOdds: '100%' },
        nr_regular: { quota: 14, minPoints: 6, oddsAtMin: '25.0%' },
        nr_special: { quota: 9, minPoints: 5, oddsAtMin: '75.0%' },
        nr_random: { quota: 4, firstChoiceApplicants: 58, approxOdds: '6.90%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 8, approxOdds: '37.50%' },
      },
    ],
  },

  '33-4': {
    unit: '33', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 33 antlerless elk. Zero NR demand.',
    tier: 'antlerless',
    coords: { lat: 44.6, lng: -108.7 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 142, firstChoiceApplicants: 1, approxOdds: '100%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 34 — Wyoming Range Foothills
  // ════════════════════════════════════════════════════════

  '34-1': {
    unit: '34', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '300-330"', topEnd: '360"+',
    trait: 'Wyoming Range foothills — accessible backcountry elk',
    description: 'Southwest Wyoming, Wyoming Range foothills. Large quota unit with accessible terrain. One of the more drawable limited units — realistic for hunters with 7+ points.',
    tier: 'mid',
    coords: { lat: 42.4, lng: -110.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 648, firstChoiceApplicants: 624, approxOdds: '100%' },
        nr_regular: { quota: 53, minPoints: 7, oddsAtMin: '42.86%' },
        nr_special: { quota: 36, minPoints: 5, oddsAtMin: '20.0%' },
        nr_random: { quota: 17, firstChoiceApplicants: 170, approxOdds: '10.0%' },
        nr_special_random: { quota: 11, firstChoiceApplicants: 41, approxOdds: '26.83%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 35
  // ════════════════════════════════════════════════════════

  '35-1': {
    unit: '35', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wyoming Range east — moderate terrain, drawable',
    description: 'Southwest Wyoming, east Wyoming Range. Draws at 8 points in regular pool with 20% odds. Accessible for moderate-point hunters.',
    tier: 'accessible',
    coords: { lat: 42.55, lng: -110.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 122, firstChoiceApplicants: 507, approxOdds: '24.06%' },
        nr_regular: { quota: 11, minPoints: 8, oddsAtMin: '20.0%' },
        nr_special: { quota: 8, minPoints: 7, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 64, approxOdds: '4.69%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 36, approxOdds: '5.56%' },
      },
    ],
  },

  '35-4': {
    unit: '35', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 35 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 42.55, lng: -110.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 147, firstChoiceApplicants: 102, approxOdds: '100%' },
        nr_regular: { quota: 21, minPoints: 0, oddsAtMin: '66.67%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 7, approxOdds: '100%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '35-9': {
    unit: '35', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wyoming Range archery — good bow terrain',
    description: 'Unit 35 archery elk. Draws at 10 points in regular pool.',
    tier: 'mid',
    coords: { lat: 42.55, lng: -110.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 190, approxOdds: '33.16%' },
        nr_regular: { quota: 6, minPoints: 10, oddsAtMin: '20.0%' },
        nr_special: { quota: 4, minPoints: 7, oddsAtMin: '66.67%' },
        nr_random: { quota: 1, firstChoiceApplicants: 57, approxOdds: '1.75%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 9, approxOdds: '11.11%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 36
  // ════════════════════════════════════════════════════════

  '36-4': {
    unit: '36', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 36 antlerless elk. Very low NR demand, essentially guaranteed.',
    tier: 'antlerless',
    coords: { lat: 42.65, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 273, firstChoiceApplicants: 22, approxOdds: '100%' },
        nr_regular: { quota: 36, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 12, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '36-9': {
    unit: '36', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Wyoming Range archery — low demand',
    description: 'Unit 36 archery elk. Draws at 4 points in regular pool with 14.29% odds.',
    tier: 'accessible',
    coords: { lat: 42.65, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 23, approxOdds: '100%' },
        nr_regular: { quota: 6, minPoints: 4, oddsAtMin: '14.29%' },
        nr_special: { quota: 4, minPoints: 3, oddsAtMin: '14.29%' },
        nr_random: { quota: 1, firstChoiceApplicants: 19, approxOdds: '5.26%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 4, approxOdds: '25.0%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 37
  // ════════════════════════════════════════════════════════

  '37-9': {
    unit: '37', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Wyoming Range south archery — moderate demand',
    description: 'Unit 37 archery elk. Draws at 7 points in regular pool with 25% odds.',
    tier: 'mid',
    coords: { lat: 42.45, lng: -110.7 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 149, approxOdds: '84.56%' },
        nr_regular: { quota: 11, minPoints: 7, oddsAtMin: '25.0%' },
        nr_special: { quota: 8, minPoints: 4, oddsAtMin: '50.0%' },
        nr_random: { quota: 3, firstChoiceApplicants: 84, approxOdds: '3.57%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 7, approxOdds: '28.57%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 38 — Wapiti / North Fork
  // ════════════════════════════════════════════════════════

  '38-1': {
    unit: '38', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '300-330"', topEnd: '360"+',
    trait: 'Wapiti Valley — classic Cody elk country',
    description: 'Northwest Wyoming, Wapiti Valley. Classic Cody-area elk hunt. Draws at 11 points in regular pool. High NR demand across all pools.',
    tier: 'mid',
    coords: { lat: 44.5, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 333, firstChoiceApplicants: 1076, approxOdds: '30.95%' },
        nr_regular: { quota: 29, minPoints: 11, oddsAtMin: '92.31%' },
        nr_special: { quota: 20, minPoints: 9, oddsAtMin: '100%' },
        nr_random: { quota: 9, firstChoiceApplicants: 324, approxOdds: '2.78%' },
        nr_special_random: { quota: 6, firstChoiceApplicants: 96, approxOdds: '6.25%' },
      },
    ],
  },

  '38-4': {
    unit: '38', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 38 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 44.5, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 459, firstChoiceApplicants: 461, approxOdds: '99.57%' },
        nr_regular: { quota: 62, minPoints: 0, oddsAtMin: '35.85%' },
        nr_special: { quota: 27, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 20, firstChoiceApplicants: 31, approxOdds: '64.52%' },
        nr_special_random: { quota: 9, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '38-9': {
    unit: '38', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '300-330"', topEnd: '360"+',
    trait: 'Wapiti Valley archery — premium bow country, tough draw',
    description: 'Unit 38 archery elk. Very high NR demand in all pools. Draws at 14 points in regular pool with 30.77% odds. One of Wyoming\'s most sought-after archery units.',
    tier: 'trophy',
    coords: { lat: 44.5, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 210, firstChoiceApplicants: 997, approxOdds: '21.06%' },
        nr_regular: { quota: 18, minPoints: 14, oddsAtMin: '30.77%' },
        nr_special: { quota: 12, minPoints: 13, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 380, approxOdds: '1.58%' },
        nr_special_random: { quota: 4, firstChoiceApplicants: 150, approxOdds: '2.67%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 39 — South Absaroka
  // ════════════════════════════════════════════════════════

  '39-1': {
    unit: '39', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '285-315"', topEnd: '345"+',
    trait: 'South Absaroka — accessible mountain elk',
    description: 'North-central Wyoming, South Absaroka Mountains. Good resident draw odds and solid bull numbers. Draws at 9 points in regular pool.',
    tier: 'mid',
    coords: { lat: 43.75, lng: -108.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 163, firstChoiceApplicants: 420, approxOdds: '38.81%' },
        nr_regular: { quota: 15, minPoints: 9, oddsAtMin: '57.14%' },
        nr_special: { quota: 10, minPoints: 7, oddsAtMin: '69.23%' },
        nr_random: { quota: 4, firstChoiceApplicants: 138, approxOdds: '2.90%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 36, approxOdds: '8.33%' },
      },
    ],
  },

  '39-4': {
    unit: '39', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 39 antlerless elk. Low NR demand.',
    tier: 'antlerless',
    coords: { lat: 43.75, lng: -108.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 153, approxOdds: '82.35%' },
        nr_regular: { quota: 18, minPoints: 1, oddsAtMin: '20.0%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 21, approxOdds: '28.57%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '39-9': {
    unit: '39', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '285-315"', topEnd: '345"+',
    trait: 'South Absaroka archery — good bow country',
    description: 'Unit 39 archery elk. Draws at 13 points in regular pool.',
    tier: 'mid',
    coords: { lat: 43.75, lng: -108.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 227, approxOdds: '37.0%' },
        nr_regular: { quota: 7, minPoints: 13, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 10, oddsAtMin: '66.67%' },
        nr_random: { quota: 2, firstChoiceApplicants: 94, approxOdds: '2.13%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 45, approxOdds: '2.22%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 40
  // ════════════════════════════════════════════════════════

  '40-1': {
    unit: '40', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Bighorn Basin foothills — moderate demand',
    description: 'North-central Wyoming. Draws at 10 points in regular pool with 25% odds.',
    tier: 'mid',
    coords: { lat: 43.9, lng: -108.4 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 188, firstChoiceApplicants: 411, approxOdds: '45.74%' },
        nr_regular: { quota: 14, minPoints: 10, oddsAtMin: '25.0%' },
        nr_special: { quota: 10, minPoints: 6, oddsAtMin: '14.29%' },
        nr_random: { quota: 4, firstChoiceApplicants: 151, approxOdds: '2.65%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 23, approxOdds: '13.04%' },
      },
    ],
  },

  '40-4': {
    unit: '40', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 40 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 43.9, lng: -108.4 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 105, firstChoiceApplicants: 56, approxOdds: '100%' },
        nr_regular: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '40-9': {
    unit: '40', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Bighorn Basin foothills archery',
    description: 'Unit 40 archery elk. Draws at 10 points in regular pool with 33.33% odds.',
    tier: 'mid',
    coords: { lat: 43.9, lng: -108.4 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 114, approxOdds: '73.68%' },
        nr_regular: { quota: 7, minPoints: 10, oddsAtMin: '33.33%' },
        nr_special: { quota: 6, minPoints: 3, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 39, approxOdds: '5.13%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 2, approxOdds: '50.0%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 41 — Bighorn Basin Foothills
  // ════════════════════════════════════════════════════════

  '41-1': {
    unit: '41', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Bighorn Basin foothills — high resident success rate',
    description: 'North-central Wyoming, Bighorn Basin foothills. Large quota unit with strong resident odds. NR hunters can draw with 9 points. Multiple season types available.',
    tier: 'mid',
    coords: { lat: 44.05, lng: -108.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 226, firstChoiceApplicants: 380, approxOdds: '59.47%' },
        nr_regular: { quota: 19, minPoints: 9, oddsAtMin: '60.0%' },
        nr_special: { quota: 13, minPoints: 7, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 165, approxOdds: '3.64%' },
        nr_special_random: { quota: 4, firstChoiceApplicants: 18, approxOdds: '22.22%' },
      },
    ],
  },

  '41-2': {
    unit: '41', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Bighorn Basin Type 2 — drawable with 8 points',
    description: 'Unit 41 Type 2 any elk. Draws at 8 points in regular pool.',
    tier: 'accessible',
    coords: { lat: 44.05, lng: -108.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 79, firstChoiceApplicants: 102, approxOdds: '77.45%' },
        nr_regular: { quota: 6, minPoints: 8, oddsAtMin: '10.0%' },
        nr_special: { quota: 5, minPoints: 4, oddsAtMin: '66.67%' },
        nr_random: { quota: 2, firstChoiceApplicants: 66, approxOdds: '3.03%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 15, approxOdds: '6.67%' },
      },
    ],
  },

  '41-3': {
    unit: '41', huntType: '3', huntTypeLabel: 'Any Elk - Rifle (Type 3)',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Bighorn Basin Type 3 — very limited quota',
    description: 'Unit 41 Type 3 any elk. Very limited quota. Draws at 13 points.',
    tier: 'mid',
    coords: { lat: 44.05, lng: -108.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 26, firstChoiceApplicants: 38, approxOdds: '68.42%' },
        nr_regular: { quota: 1, minPoints: 13, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 8, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 16, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 5, approxOdds: null },
      },
    ],
  },

  '41-4': {
    unit: '41', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 41 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 44.05, lng: -108.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 294, firstChoiceApplicants: 52, approxOdds: '100%' },
        nr_regular: { quota: 42, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 13, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '41-9': {
    unit: '41', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Bighorn Basin foothills archery — moderate demand',
    description: 'Unit 41 archery elk. Draws at 10 points in regular pool with 16.67% odds.',
    tier: 'mid',
    coords: { lat: 44.05, lng: -108.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 104, firstChoiceApplicants: 255, approxOdds: '40.78%' },
        nr_regular: { quota: 9, minPoints: 10, oddsAtMin: '16.67%' },
        nr_special: { quota: 6, minPoints: 7, oddsAtMin: '33.33%' },
        nr_random: { quota: 3, firstChoiceApplicants: 85, approxOdds: '3.53%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 70, approxOdds: '2.86%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 45 — Absaroka Foothills
  // ════════════════════════════════════════════════════════

  '45-1': {
    unit: '45', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Absaroka foothills — premium NW Wyoming unit',
    description: 'Northwest Wyoming, Absaroka Range foothills east of Yellowstone. Good bull country with high NR demand. Draws at 12-13 points.',
    tier: 'mid',
    coords: { lat: 44.15, lng: -109.25 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 268, firstChoiceApplicants: 919, approxOdds: '29.16%' },
        nr_regular: { quota: 24, minPoints: 12, oddsAtMin: '81.82%' },
        nr_special: { quota: 17, minPoints: 12, oddsAtMin: '18.18%' },
        nr_random: { quota: 7, firstChoiceApplicants: 286, approxOdds: '2.45%' },
        nr_special_random: { quota: 5, firstChoiceApplicants: 66, approxOdds: '7.58%' },
      },
    ],
  },

  '45-4': {
    unit: '45', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 45 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 44.15, lng: -109.25 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 210, firstChoiceApplicants: 84, approxOdds: '100%' },
        nr_regular: { quota: 27, minPoints: 0, oddsAtMin: '32.14%' },
        nr_special: { quota: 12, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 9, firstChoiceApplicants: 19, approxOdds: '47.37%' },
        nr_special_random: { quota: 4, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '45-5': {
    unit: '45', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag (Type 5)',
    description: 'Unit 45 Type 5 antlerless elk.',
    tier: 'antlerless',
    coords: { lat: 44.15, lng: -109.25 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 168, firstChoiceApplicants: 132, approxOdds: '100%' },
        nr_regular: { quota: 22, minPoints: 0, oddsAtMin: '9.68%' },
        nr_special: { quota: 10, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 28, approxOdds: '25.0%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '45-9': {
    unit: '45', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Absaroka foothills archery — premium bow unit',
    description: 'Unit 45 archery elk. Draws at 12 points in regular pool with 83.33% odds.',
    tier: 'mid',
    coords: { lat: 44.15, lng: -109.25 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 143, firstChoiceApplicants: 441, approxOdds: '32.43%' },
        nr_regular: { quota: 12, minPoints: 12, oddsAtMin: '83.33%' },
        nr_special: { quota: 9, minPoints: 10, oddsAtMin: '20.0%' },
        nr_random: { quota: 4, firstChoiceApplicants: 131, approxOdds: '3.05%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 38, approxOdds: '7.89%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 47
  // ════════════════════════════════════════════════════════

  '47-1': {
    unit: '47', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Wind River area — accessible, low demand',
    description: 'West-central Wyoming. Low NR demand — draws at 3 points in regular pool with 66.67% odds. Good option for lower-point hunters.',
    tier: 'accessible',
    coords: { lat: 43.2, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 102, firstChoiceApplicants: 72, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 3, oddsAtMin: '66.67%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 31, approxOdds: '9.68%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 48 — Wind River Country
  // ════════════════════════════════════════════════════════

  '48-1': {
    unit: '48', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Wind River country — accessible mountain elk',
    description: 'West-central Wyoming, Wind River Range foothills. Solid elk numbers, accessible terrain, and drawable for moderate-point NR hunters at 7 points.',
    tier: 'mid',
    coords: { lat: 43.05, lng: -109.35 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 306, firstChoiceApplicants: 273, approxOdds: '100%' },
        nr_regular: { quota: 26, minPoints: 7, oddsAtMin: '54.55%' },
        nr_special: { quota: 18, minPoints: 7, oddsAtMin: '100%' },
        nr_random: { quota: 8, firstChoiceApplicants: 119, approxOdds: '6.72%' },
        nr_special_random: { quota: 6, firstChoiceApplicants: 40, approxOdds: '15.0%' },
      },
    ],
  },

  '48-4': {
    unit: '48', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 48 antlerless elk. Zero NR demand.',
    tier: 'antlerless',
    coords: { lat: 43.05, lng: -109.35 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 120, firstChoiceApplicants: 6, approxOdds: '100%' },
        nr_regular: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 49
  // ════════════════════════════════════════════════════════

  '49-1': {
    unit: '49', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wind River south — moderate draw difficulty',
    description: 'West-central Wyoming. Draws at 9-10 points in regular pool.',
    tier: 'mid',
    coords: { lat: 42.95, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 258, firstChoiceApplicants: 327, approxOdds: '78.90%' },
        nr_regular: { quota: 16, minPoints: 9, oddsAtMin: '50.0%' },
        nr_special: { quota: 12, minPoints: 5, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 124, approxOdds: '4.03%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 20, approxOdds: '15.0%' },
      },
    ],
  },

  '49-4': {
    unit: '49', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 49 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 42.95, lng: -109.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 86, firstChoiceApplicants: 18, approxOdds: '100%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 4, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 51
  // ════════════════════════════════════════════════════════

  '51-1': {
    unit: '51', huntType: '1', huntTypeLabel: 'Any Elk - Rifle (South)',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Upper Green River south — remote country',
    description: 'West-central Wyoming, upper Green River south zone. Moderate NR demand. Draws at 12 points in regular pool.',
    tier: 'mid',
    coords: { lat: 43.0, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 100, firstChoiceApplicants: 297, approxOdds: '33.67%' },
        nr_regular: { quota: 9, minPoints: 12, oddsAtMin: '66.67%' },
        nr_special: { quota: 6, minPoints: 15, oddsAtMin: '60.0%' },
        nr_random: { quota: 2, firstChoiceApplicants: 200, approxOdds: '1.0%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 25, approxOdds: '8.0%' },
      },
    ],
  },

  '51-2': {
    unit: '51', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (North)',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Upper Green River north zone',
    description: 'Unit 51 North zone. Very limited quota, draws at 11 points.',
    tier: 'mid',
    coords: { lat: 43.15, lng: -109.85 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 34, firstChoiceApplicants: 76, approxOdds: '44.74%' },
        nr_regular: { quota: 3, minPoints: 11, oddsAtMin: '50.0%' },
        nr_special: { quota: 2, minPoints: 10, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 13, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 2, approxOdds: null },
      },
    ],
  },

  '51-4': {
    unit: '51', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 51 antlerless elk. Low NR demand.',
    tier: 'antlerless',
    coords: { lat: 43.0, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 42, firstChoiceApplicants: 113, approxOdds: '37.17%' },
        nr_regular: { quota: 6, minPoints: 1, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 16, approxOdds: '6.25%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '51-9': {
    unit: '51', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Upper Green River archery',
    description: 'Unit 51 archery elk. Moderate demand, draws at 8 points.',
    tier: 'mid',
    coords: { lat: 43.0, lng: -109.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 67, firstChoiceApplicants: 77, approxOdds: '87.01%' },
        nr_regular: { quota: 6, minPoints: 8, oddsAtMin: '100%' },
        nr_special: { quota: 5, minPoints: 6, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 24, approxOdds: '4.17%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 11, approxOdds: '9.09%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 54
  // ════════════════════════════════════════════════════════

  '54-1': {
    unit: '54', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Bridger Wilderness edge — remote elk country',
    description: 'West-central Wyoming, Bridger Wilderness edge. Small quota with moderate point requirements.',
    tier: 'mid',
    coords: { lat: 42.9, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 50, firstChoiceApplicants: 180, approxOdds: '27.78%' },
        nr_regular: { quota: 3, minPoints: 11, oddsAtMin: '33.33%' },
        nr_special: { quota: 3, minPoints: 9, oddsAtMin: '33.33%' },
        nr_random: { quota: 1, firstChoiceApplicants: 43, approxOdds: '2.33%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 18, approxOdds: '5.56%' },
      },
    ],
  },

  '54-2': {
    unit: '54', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Bridger Wilderness edge Type 2',
    description: 'Unit 54 Type 2 elk. Draws at 11 points.',
    tier: 'mid',
    coords: { lat: 42.9, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 63, approxOdds: '33.33%' },
        nr_regular: { quota: 2, minPoints: 11, oddsAtMin: '33.33%' },
        nr_special: { quota: 2, minPoints: 10, oddsAtMin: '33.33%' },
        nr_random: { quota: 0, firstChoiceApplicants: 10, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 8, approxOdds: null },
      },
    ],
  },

  '54-3': {
    unit: '54', huntType: '3', huntTypeLabel: 'Any Elk - Rifle (Type 3)',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Bridger Wilderness edge Type 3 — very limited',
    description: 'Unit 54 Type 3. Quota of 1 — essentially a raffle.',
    tier: 'mid',
    coords: { lat: 42.9, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 2, firstChoiceApplicants: 78, approxOdds: '2.56%' },
        nr_regular: { quota: 1, minPoints: 13, oddsAtMin: '100%' },
        nr_special: { quota: 1, minPoints: 9, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 2, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '54-9': {
    unit: '54', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Bridger Wilderness archery — good bow country',
    description: 'Unit 54 archery elk. Draws at 12 points in regular pool.',
    tier: 'mid',
    coords: { lat: 42.9, lng: -109.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 34, firstChoiceApplicants: 44, approxOdds: '77.27%' },
        nr_regular: { quota: 3, minPoints: 12, oddsAtMin: '50.0%' },
        nr_special: { quota: 2, minPoints: 11, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 21, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 12, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 55
  // ════════════════════════════════════════════════════════

  '55-1': {
    unit: '55', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wind River south — small quota, moderate demand',
    description: 'West-central Wyoming. Small quota with moderate NR demand. Draws at 13 points.',
    tier: 'mid',
    coords: { lat: 42.8, lng: -109.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 50, firstChoiceApplicants: 185, approxOdds: '27.03%' },
        nr_regular: { quota: 5, minPoints: 13, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 13, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 33, approxOdds: '3.03%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 36, approxOdds: '2.78%' },
      },
    ],
  },

  '55-9': {
    unit: '55', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wind River south archery',
    description: 'Unit 55 archery elk. Draws at 9 points in regular pool.',
    tier: 'mid',
    coords: { lat: 42.8, lng: -109.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 22, approxOdds: '100%' },
        nr_regular: { quota: 2, minPoints: 9, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 4, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 19, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 3, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 56 — Upper Green River
  // ════════════════════════════════════════════════════════

  '56-1': {
    unit: '56', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '320-350"', topEnd: '380"+',
    trait: 'Upper Green River — remote wilderness bulls',
    description: 'West-central Wyoming, upper Green River drainage and Bridger Wilderness. Remote pack-in country with quality bulls. Minimal NR quota. Draws at 18 points with only 16.67% odds.',
    tier: 'trophy',
    coords: { lat: 43.1, lng: -109.7 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 8, firstChoiceApplicants: 205, approxOdds: '3.90%' },
        nr_regular: { quota: 1, minPoints: 18, oddsAtMin: '16.67%' },
        nr_special: { quota: 1, minPoints: 18, oddsAtMin: '50.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 53, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 9, approxOdds: null },
      },
    ],
  },

  '56-9': {
    unit: '56', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '310-340"', topEnd: '370"+',
    trait: 'Upper Green River archery — wilderness bulls on the bow',
    description: 'Unit 56 archery elk. Draws at 4 points in regular pool. Surprisingly accessible for what the area holds in trophy potential.',
    tier: 'accessible',
    coords: { lat: 43.1, lng: -109.7 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 25, firstChoiceApplicants: 2, approxOdds: '100%' },
        nr_regular: { quota: 3, minPoints: 4, oddsAtMin: '50.0%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '50.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 18, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 1, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 58, 59
  // ════════════════════════════════════════════════════════

  '58-1': {
    unit: '58', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '310-340"', topEnd: '370"+',
    trait: 'South Yellowstone area — high demand, low NR quota',
    description: 'Northwest Wyoming, south Yellowstone area. Zero NR random quota. Draws at 18 points in both regular and special pools.',
    tier: 'trophy',
    coords: { lat: 44.1, lng: -110.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 225, approxOdds: '9.33%' },
        nr_regular: { quota: 3, minPoints: 17, oddsAtMin: '40.0%' },
        nr_special: { quota: 3, minPoints: 17, oddsAtMin: '40.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 34, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 16, approxOdds: null },
      },
    ],
  },

  '59-1': {
    unit: '59', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '310-340"', topEnd: '370"+',
    trait: 'Yellowstone boundary — extremely tough NR draw',
    description: 'Northwest Wyoming, Yellowstone boundary area. Tiny quota. Draws at 18 points with only 20% odds in regular pool.',
    tier: 'trophy',
    coords: { lat: 44.3, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 8, firstChoiceApplicants: 191, approxOdds: '4.19%' },
        nr_regular: { quota: 1, minPoints: 18, oddsAtMin: '20.0%' },
        nr_special: { quota: 1, minPoints: 18, oddsAtMin: '25.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 34, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 19, approxOdds: null },
      },
    ],
  },

  '59-9': {
    unit: '59', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '300-330"', topEnd: '360"+',
    trait: 'Yellowstone boundary archery',
    description: 'Unit 59 archery elk. Very small quota, moderate demand.',
    tier: 'mid',
    coords: { lat: 44.3, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 0, approxOdds: '100%' },
        nr_regular: { quota: 2, minPoints: 1, oddsAtMin: '50.0%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '28.57%' },
        nr_random: { quota: 0, firstChoiceApplicants: 3, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 5, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 60
  // ════════════════════════════════════════════════════════

  '60-9': {
    unit: '60', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Jackson/Gros Ventre archery — premium bow country',
    description: 'Northwest Wyoming near Gros Ventre. Archery only. Very small quota.',
    tier: 'trophy',
    coords: { lat: 43.55, lng: -110.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 17, firstChoiceApplicants: 2, approxOdds: '100%' },
        nr_regular: { quota: 1, minPoints: 7, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 3, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 26, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 4, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 61
  // ════════════════════════════════════════════════════════

  '61-1': {
    unit: '61', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Wind River south — high resident demand',
    description: 'South-central Wyoming. High resident demand. Draws at 11 points in regular pool with 20% odds.',
    tier: 'mid',
    coords: { lat: 42.65, lng: -109.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 398, approxOdds: '31.66%' },
        nr_regular: { quota: 11, minPoints: 11, oddsAtMin: '20.0%' },
        nr_special: { quota: 8, minPoints: 13, oddsAtMin: '60.0%' },
        nr_random: { quota: 3, firstChoiceApplicants: 289, approxOdds: '1.04%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 43, approxOdds: '4.65%' },
      },
    ],
  },

  '61-2': {
    unit: '61', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wind River south Type 2 — very limited quota',
    description: 'Unit 61 Type 2. Zero NR quota issued in 2024.',
    tier: 'mid',
    coords: { lat: 42.65, lng: -109.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 34, firstChoiceApplicants: 314, approxOdds: '10.83%' },
        nr_regular: { quota: 0, minPoints: null, oddsAtMin: null, notes: 'No NR quota in 2024' },
        nr_special: { quota: 0, minPoints: null, oddsAtMin: null },
        nr_random: { quota: 0, firstChoiceApplicants: 57, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 8, approxOdds: null },
      },
    ],
  },

  '61-4': {
    unit: '61', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 61 antlerless elk. Low demand, drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 42.65, lng: -109.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 171, firstChoiceApplicants: 27, approxOdds: '100%' },
        nr_regular: { quota: 24, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 10, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '61-9': {
    unit: '61', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Wind River south archery',
    description: 'Unit 61 archery elk. Very low demand — essentially zero NR quota available.',
    tier: 'mid',
    coords: { lat: 42.65, lng: -109.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 23, firstChoiceApplicants: 22, approxOdds: '100%' },
        nr_regular: { quota: 2, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 62
  // ════════════════════════════════════════════════════════

  '62-1': {
    unit: '62', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Upper Wind River — high demand, tough draw',
    description: 'West-central Wyoming. Draws at 14 points in regular pool. High NR demand.',
    tier: 'mid',
    coords: { lat: 43.4, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 100, firstChoiceApplicants: 597, approxOdds: '16.75%' },
        nr_regular: { quota: 8, minPoints: 14, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 15, oddsAtMin: '50.0%' },
        nr_random: { quota: 2, firstChoiceApplicants: 204, approxOdds: '0.98%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 82, approxOdds: '2.44%' },
      },
    ],
  },

  '62-4': {
    unit: '62', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 62 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 43.4, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 11, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 0, oddsAtMin: '70.0%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 1, approxOdds: '100%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '62-5': {
    unit: '62', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag (Type 5)',
    description: 'Unit 62 Type 5 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 43.4, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 146, firstChoiceApplicants: 114, approxOdds: '100%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '6.90%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 27, approxOdds: '22.22%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 63
  // ════════════════════════════════════════════════════════

  '63-1': {
    unit: '63', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Dubois area — high demand trophy country',
    description: 'West-central Wyoming, Dubois area. Very high NR demand. Draws at 15 points in regular pool with 50% odds.',
    tier: 'trophy',
    coords: { lat: 43.55, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 140, firstChoiceApplicants: 622, approxOdds: '22.51%' },
        nr_regular: { quota: 9, minPoints: 15, oddsAtMin: '50.0%' },
        nr_special: { quota: 6, minPoints: 16, oddsAtMin: '75.0%' },
        nr_random: { quota: 2, firstChoiceApplicants: 181, approxOdds: '1.10%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 118, approxOdds: '1.69%' },
      },
    ],
  },

  '63-2': {
    unit: '63', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Dubois area Type 2',
    description: 'Unit 63 Type 2 elk. Very small quota, draws at 5+ points.',
    tier: 'mid',
    coords: { lat: 43.55, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 29, firstChoiceApplicants: 86, approxOdds: '33.72%' },
        nr_regular: { quota: 3, minPoints: 5, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 13, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 1, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 8, approxOdds: null },
      },
    ],
  },

  '63-3': {
    unit: '63', huntType: '3', huntTypeLabel: 'Any Elk - Rifle (Type 3)',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Dubois area Type 3',
    description: 'Unit 63 Type 3 elk. Very high NR demand. Draws at 14 points in regular pool with 20% odds.',
    tier: 'mid',
    coords: { lat: 43.55, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 56, firstChoiceApplicants: 299, approxOdds: '18.73%' },
        nr_regular: { quota: 5, minPoints: 14, oddsAtMin: '20.0%' },
        nr_special: { quota: 3, minPoints: 12, oddsAtMin: '50.0%' },
        nr_random: { quota: 1, firstChoiceApplicants: 95, approxOdds: '1.05%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 42, approxOdds: '2.38%' },
      },
    ],
  },

  '63-4': {
    unit: '63', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 63 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 43.55, lng: -109.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 82, firstChoiceApplicants: 14, approxOdds: '100%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '62.50%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 6, approxOdds: '50.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 65
  // ════════════════════════════════════════════════════════

  '65-1': {
    unit: '65', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Remote west Wyoming — essentially no NR quota',
    description: 'West Wyoming. Zero NR regular quota issued in 2024. Very difficult draw.',
    tier: 'mid',
    coords: { lat: 43.3, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 17, firstChoiceApplicants: 54, approxOdds: '31.48%' },
        nr_regular: { quota: 0, minPoints: null, oddsAtMin: null, notes: 'No NR regular quota issued in 2024' },
        nr_special: { quota: 1, minPoints: 0, oddsAtMin: '25.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 14, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '65-4': {
    unit: '65', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 65 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 43.3, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 96, firstChoiceApplicants: 9, approxOdds: '100%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 4, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 67
  // ════════════════════════════════════════════════════════

  '67-4': {
    unit: '67', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'High quota antlerless — guaranteed draw',
    description: 'West Wyoming. High antlerless quota with zero NR demand. Essentially a guaranteed tag.',
    tier: 'antlerless',
    coords: { lat: 43.5, lng: -110.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 336, firstChoiceApplicants: 360, approxOdds: '93.33%' },
        nr_regular: { quota: 47, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 20, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 15, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 6, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '67-9': {
    unit: '67', huntType: '9', huntTypeLabel: 'Any Elk - Archery',
    typical: '280-310"', topEnd: '340"+',
    trait: 'West Wyoming archery — high NR demand',
    description: 'Unit 67 archery elk. High NR demand. Draws at 6 points in regular pool with 50% odds.',
    tier: 'mid',
    coords: { lat: 43.5, lng: -110.8 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 34, approxOdds: '100%' },
        nr_regular: { quota: 11, minPoints: 6, oddsAtMin: '50.0%' },
        nr_special: { quota: 8, minPoints: 4, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 106, approxOdds: '2.83%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 30, approxOdds: '6.67%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 75
  // ════════════════════════════════════════════════════════

  '75-4': {
    unit: '75', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 75 antlerless elk. Very small quota, moderate NR demand.',
    tier: 'antlerless',
    coords: { lat: 44.0, lng: -110.7 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 17, firstChoiceApplicants: 46, approxOdds: '36.96%' },
        nr_regular: { quota: 2, minPoints: 1, oddsAtMin: '20.0%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 16, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 78
  // ════════════════════════════════════════════════════════

  '78-1': {
    unit: '78', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Wind River headwaters — remote, low demand',
    description: 'West-central Wyoming, Wind River headwaters. Low NR demand. Draws at 7 points in regular pool.',
    tier: 'accessible',
    coords: { lat: 43.55, lng: -109.85 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 60, firstChoiceApplicants: 117, approxOdds: '51.28%' },
        nr_regular: { quota: 5, minPoints: 7, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 2, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 25, approxOdds: '4.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 2, approxOdds: '50.0%' },
      },
    ],
  },

  '78-2': {
    unit: '78', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Wind River headwaters Type 2 — very low demand',
    description: 'Unit 78 Type 2 elk. Very low NR demand. Draws at 1 point.',
    tier: 'accessible',
    coords: { lat: 43.55, lng: -109.85 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 42, firstChoiceApplicants: 12, approxOdds: '100%' },
        nr_regular: { quota: 3, minPoints: 1, oddsAtMin: '25.0%' },
        nr_special: { quota: 3, minPoints: 1, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 3, approxOdds: '33.33%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 2, approxOdds: '50.0%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 82
  // ════════════════════════════════════════════════════════

  '82-4': {
    unit: '82', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 82 antlerless elk. Low demand, drawable with 1 point.',
    tier: 'antlerless',
    coords: { lat: 43.7, lng: -110.85 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 42, firstChoiceApplicants: 47, approxOdds: '89.36%' },
        nr_regular: { quota: 6, minPoints: 1, oddsAtMin: '75.0%' },
        nr_special: { quota: 3, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 4, approxOdds: '25.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 84
  // ════════════════════════════════════════════════════════

  '84-1': {
    unit: '84', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'South Wyoming Range — low pressure unit',
    description: 'Southwest Wyoming. Low NR demand. Draws at 4 points in regular pool with 40% odds. Good for hunters building points.',
    tier: 'accessible',
    coords: { lat: 42.3, lng: -110.9 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 42, firstChoiceApplicants: 49, approxOdds: '85.71%' },
        nr_regular: { quota: 3, minPoints: 4, oddsAtMin: '40.0%' },
        nr_special: { quota: 3, minPoints: 1, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 47, approxOdds: '2.13%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 3, approxOdds: '33.33%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 87
  // ════════════════════════════════════════════════════════

  '87-1': {
    unit: '87', huntType: '1', huntTypeLabel: 'Antlered Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Remote unit — very limited quota',
    description: 'Small quota unit. Draws at 7 points in regular pool.',
    tier: 'mid',
    coords: { lat: 43.8, lng: -110.95 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 8, firstChoiceApplicants: 28, approxOdds: '28.57%' },
        nr_regular: { quota: 1, minPoints: 7, oddsAtMin: '100%' },
        nr_special: { quota: 1, minPoints: 4, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 28, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 1, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 88
  // ════════════════════════════════════════════════════════

  '88-1': {
    unit: '88', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Remote Wyoming unit — low demand, drawable',
    description: 'Remote unit. Draws at 5 points in regular pool. Very low NR demand.',
    tier: 'accessible',
    coords: { lat: 43.9, lng: -110.95 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 34, firstChoiceApplicants: 87, approxOdds: '39.08%' },
        nr_regular: { quota: 3, minPoints: 5, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 0, oddsAtMin: '50.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 10, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 91
  // ════════════════════════════════════════════════════════

  '91-1': {
    unit: '91', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Sierra Madre foothills — moderate demand',
    description: 'South-central Wyoming. Draws at 13 points in regular pool with 50% odds.',
    tier: 'mid',
    coords: { lat: 41.3, lng: -107.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 323, approxOdds: '26.01%' },
        nr_regular: { quota: 3, minPoints: 13, oddsAtMin: '50.0%' },
        nr_special: { quota: 3, minPoints: 5, oddsAtMin: '50.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 51, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 4, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 93
  // ════════════════════════════════════════════════════════

  '93-1': {
    unit: '93', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Sierra Madre core — moderate points required',
    description: 'South-central Wyoming, Sierra Madre. Draws at 6 points in regular pool with 40% odds. Good mid-range option.',
    tier: 'accessible',
    coords: { lat: 41.2, lng: -107.0 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 165, firstChoiceApplicants: 178, approxOdds: '92.70%' },
        nr_regular: { quota: 14, minPoints: 6, oddsAtMin: '40.0%' },
        nr_special: { quota: 9, minPoints: 6, oddsAtMin: '50.0%' },
        nr_random: { quota: 4, firstChoiceApplicants: 58, approxOdds: '6.90%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 23, approxOdds: '13.04%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 95 — Sierra Madre
  // ════════════════════════════════════════════════════════

  '95-1': {
    unit: '95', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Sierra Madre — overlooked mid-tier trophy unit',
    description: 'South-central Wyoming, Sierra Madre Range. Underrated unit with solid bulls and good drawable odds for NR hunters. Draws at 8 points in regular pool.',
    tier: 'mid',
    coords: { lat: 41.2, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 189, firstChoiceApplicants: 363, approxOdds: '52.07%' },
        nr_regular: { quota: 16, minPoints: 8, oddsAtMin: '100%' },
        nr_special: { quota: 12, minPoints: 5, oddsAtMin: '91.67%' },
        nr_random: { quota: 5, firstChoiceApplicants: 110, approxOdds: '4.55%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 18, approxOdds: '16.67%' },
      },
    ],
  },

  '95-2': {
    unit: '95', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Sierra Madre Type 2 — very drawable',
    description: 'Unit 95 Type 2 elk. Very low demand. Draws at 4 points with 40% odds.',
    tier: 'accessible',
    coords: { lat: 41.2, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 25, firstChoiceApplicants: 10, approxOdds: '100%' },
        nr_regular: { quota: 3, minPoints: 4, oddsAtMin: '40.0%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '50.0%' },
        nr_random: { quota: 0, firstChoiceApplicants: 5, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '95-4': {
    unit: '95', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 95 antlerless elk. Very low demand, drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 41.2, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 127, firstChoiceApplicants: 9, approxOdds: '100%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '95-5': {
    unit: '95', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag (Type 5)',
    description: 'Unit 95 Type 5 antlerless elk. Very small quota.',
    tier: 'antlerless',
    coords: { lat: 41.2, lng: -107.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 21, firstChoiceApplicants: 0, approxOdds: '100%' },
        nr_regular: { quota: 3, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 2, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 96 — Medicine Bow
  // ════════════════════════════════════════════════════════

  '96-1': {
    unit: '96', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Medicine Bow — accessible lower elevation elk',
    description: 'Southeast Wyoming, Medicine Bow Mountains. Lower elevation with good road access. One of the most drawable limited units in the state for NR hunters.',
    tier: 'accessible',
    coords: { lat: 41.5, lng: -106.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 231, firstChoiceApplicants: 74, approxOdds: '100%' },
        nr_regular: { quota: 21, minPoints: 2, oddsAtMin: '50.0%' },
        nr_special: { quota: 14, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 25, approxOdds: '28.0%' },
        nr_special_random: { quota: 4, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  '96-4': {
    unit: '96', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 96 antlerless elk. Essentially zero NR demand.',
    tier: 'antlerless',
    coords: { lat: 41.5, lng: -106.2 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 146, firstChoiceApplicants: 5, approxOdds: '100%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 97
  // ════════════════════════════════════════════════════════

  '97-1': {
    unit: '97', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Medicine Bow south — very drawable for NR hunters',
    description: 'Southeast Wyoming. Very low NR demand. Draws at 4-5 points in regular pool.',
    tier: 'accessible',
    coords: { lat: 41.3, lng: -106.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 189, firstChoiceApplicants: 72, approxOdds: '100%' },
        nr_regular: { quota: 16, minPoints: 4, oddsAtMin: '40.0%' },
        nr_special: { quota: 12, minPoints: 2, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 70, approxOdds: '7.14%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 7, approxOdds: '42.86%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 98 — Snowy Range
  // ════════════════════════════════════════════════════════

  '98-1': {
    unit: '98', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Snowy Range — high success rate, good access',
    description: 'Southeast Wyoming, Snowy Range/Medicine Bow. Good bull density, high success rates, and accessible terrain. Drawable with 4-5 NR points.',
    tier: 'accessible',
    coords: { lat: 41.35, lng: -106.35 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 294, firstChoiceApplicants: 329, approxOdds: '89.36%' },
        nr_regular: { quota: 25, minPoints: 4, oddsAtMin: '46.67%' },
        nr_special: { quota: 18, minPoints: 3, oddsAtMin: '25.0%' },
        nr_random: { quota: 8, firstChoiceApplicants: 101, approxOdds: '7.92%' },
        nr_special_random: { quota: 5, firstChoiceApplicants: 9, approxOdds: '55.56%' },
      },
    ],
  },

  '98-4': {
    unit: '98', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 98 antlerless elk. Very low demand, essentially guaranteed.',
    tier: 'antlerless',
    coords: { lat: 41.35, lng: -106.35 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 67, firstChoiceApplicants: 4, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 99 — Salt River Range
  // ════════════════════════════════════════════════════════

  '99-1': {
    unit: '99', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Salt River Range — overlooked southwest Wyoming unit',
    description: 'Southwest Wyoming, Salt River Range. Solid bull numbers and lower NR pressure than nearby units. Draws at 10 points in regular pool.',
    tier: 'mid',
    coords: { lat: 42.6, lng: -110.9 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 123, firstChoiceApplicants: 440, approxOdds: '27.95%' },
        nr_regular: { quota: 11, minPoints: 10, oddsAtMin: '85.71%' },
        nr_special: { quota: 8, minPoints: 8, oddsAtMin: '28.57%' },
        nr_random: { quota: 3, firstChoiceApplicants: 84, approxOdds: '3.57%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 51, approxOdds: '3.92%' },
      },
    ],
  },

  '99-4': {
    unit: '99', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 99 antlerless elk. Low demand.',
    tier: 'antlerless',
    coords: { lat: 42.6, lng: -110.9 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 147, firstChoiceApplicants: 42, approxOdds: '100%' },
        nr_regular: { quota: 21, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 100 — Red Desert
  // ════════════════════════════════════════════════════════

  '100-1': {
    unit: '100', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '320-360"', topEnd: '390"+',
    trait: 'Desert elk on Wyoming\'s Red Desert — unique late-season bulls',
    description: 'Southwest Wyoming, Red Desert and surrounding sage/sand country. Desert elk hunt unlike anything else in the state. Enormous bulls. Draws at 18 points in regular pool with 62.50% odds. One of Wyoming\'s most unique and coveted tags.',
    tier: 'trophy',
    coords: { lat: 41.85, lng: -108.95 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 138, firstChoiceApplicants: 3948, approxOdds: '3.50%' },
        nr_regular: { quota: 10, minPoints: 18, oddsAtMin: '62.50%' },
        nr_special: { quota: 8, minPoints: 18, oddsAtMin: '72.73%' },
        nr_random: { quota: 3, firstChoiceApplicants: 898, approxOdds: '0.33%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 224, approxOdds: '0.89%' },
      },
    ],
  },

  '100-2': {
    unit: '100', huntType: '2', huntTypeLabel: 'Any Elk - Rifle (Type 2)',
    typical: '310-350"', topEnd: '380"+',
    trait: 'Red Desert Type 2 — slightly more accessible',
    description: 'Unit 100 Type 2 elk. Draws at 13 points in regular pool. Still a premium trophy opportunity.',
    tier: 'trophy',
    coords: { lat: 41.85, lng: -108.95 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 311, approxOdds: '27.01%' },
        nr_regular: { quota: 7, minPoints: 13, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 2, oddsAtMin: '33.33%' },
        nr_random: { quota: 2, firstChoiceApplicants: 63, approxOdds: '3.17%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 6, approxOdds: '16.67%' },
      },
    ],
  },

  '100-4': {
    unit: '100', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Red Desert antlerless — moderate demand',
    description: 'Unit 100 antlerless elk. Moderate NR demand relative to the unit\'s fame.',
    tier: 'antlerless',
    coords: { lat: 41.85, lng: -108.95 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 147, firstChoiceApplicants: 307, approxOdds: '47.88%' },
        nr_regular: { quota: 12, minPoints: 5, oddsAtMin: '100%' },
        nr_special: { quota: 9, minPoints: 0, oddsAtMin: '66.67%' },
        nr_random: { quota: 4, firstChoiceApplicants: 45, approxOdds: '8.89%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 1, approxOdds: '100%' },
      },
    ],
  },

  '100-5': {
    unit: '100', huntType: '5', huntTypeLabel: 'Antlerless - Rifle (Type 5)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Red Desert antlerless Type 5',
    description: 'Unit 100 Type 5 antlerless elk. Drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 41.85, lng: -108.95 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 210, firstChoiceApplicants: 389, approxOdds: '53.98%' },
        nr_regular: { quota: 29, minPoints: 0, oddsAtMin: '29.03%' },
        nr_special: { quota: 12, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 9, firstChoiceApplicants: 22, approxOdds: '40.91%' },
        nr_special_random: { quota: 4, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 106
  // ════════════════════════════════════════════════════════

  '106-1': {
    unit: '106', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '270-300"', topEnd: '330"+',
    trait: 'Sweetwater area — low demand, accessible',
    description: 'South-central Wyoming. Low NR demand. Draws at 9 points with 66.67% odds.',
    tier: 'accessible',
    coords: { lat: 42.05, lng: -108.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 42, firstChoiceApplicants: 171, approxOdds: '24.56%' },
        nr_regular: { quota: 3, minPoints: 9, oddsAtMin: '66.67%' },
        nr_special: { quota: 3, minPoints: 4, oddsAtMin: '50.0%' },
        nr_random: { quota: 1, firstChoiceApplicants: 41, approxOdds: '2.44%' },
        nr_special_random: { quota: 0, firstChoiceApplicants: 4, approxOdds: null },
      },
    ],
  },

  '106-4': {
    unit: '106', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 106 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 42.05, lng: -108.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 84, approxOdds: '100%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 107
  // ════════════════════════════════════════════════════════

  '107-4': {
    unit: '107', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 107 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 42.15, lng: -108.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 179, firstChoiceApplicants: 33, approxOdds: '100%' },
        nr_regular: { quota: 24, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 10, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 7, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 3, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 108
  // ════════════════════════════════════════════════════════

  '108-1': {
    unit: '108', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Wind River south — moderate demand',
    description: 'West-central Wyoming. Draws at 12 points in regular pool with 50% odds.',
    tier: 'mid',
    coords: { lat: 42.75, lng: -109.15 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 79, firstChoiceApplicants: 273, approxOdds: '28.94%' },
        nr_regular: { quota: 5, minPoints: 12, oddsAtMin: '50.0%' },
        nr_special: { quota: 4, minPoints: 12, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 44, approxOdds: '2.27%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 26, approxOdds: '3.85%' },
      },
    ],
  },

  '108-4': {
    unit: '108', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 108 antlerless elk. Very low demand.',
    tier: 'antlerless',
    coords: { lat: 42.75, lng: -109.15 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 12, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 111 — Gros Ventre
  // ════════════════════════════════════════════════════════

  '111-1': {
    unit: '111', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '330-360"', topEnd: '390"+',
    trait: 'Gros Ventre and upper Snake drainage — elite trophy potential',
    description: 'Northwest Wyoming, Gros Ventre Wilderness and upper Snake River country. Remote backcountry with massive bulls. Essentially no NR random quota — points-only unit.',
    tier: 'trophy',
    coords: { lat: 43.5, lng: -110.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 59, firstChoiceApplicants: 469, approxOdds: '12.58%' },
        nr_regular: { quota: 3, minPoints: 18, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 18, oddsAtMin: '100%' },
        nr_random: { quota: 1, firstChoiceApplicants: 29, approxOdds: '3.45%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 18, approxOdds: '5.56%' },
      },
    ],
  },

  '111-4': {
    unit: '111', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 111 antlerless elk. Low demand.',
    tier: 'antlerless',
    coords: { lat: 43.5, lng: -110.3 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 135, firstChoiceApplicants: 10, approxOdds: '100%' },
        nr_regular: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 6, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 113 — Wyoming Range
  // ════════════════════════════════════════════════════════

  '113-3': {
    unit: '113', huntType: '3', huntTypeLabel: 'Spike or Antlerless - Rifle',
    typical: '270-300"', topEnd: '320"+',
    trait: 'Wyoming Range — steep canyon country',
    description: 'Southwest Wyoming, Wyoming Range. Spike or antlerless management tag. Draws at 2 points in regular pool.',
    tier: 'mid',
    coords: { lat: 42.7, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 102, firstChoiceApplicants: 365, approxOdds: '27.95%' },
        nr_regular: { quota: 16, minPoints: 2, oddsAtMin: '91.67%' },
        nr_special: { quota: 8, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 31, approxOdds: '16.13%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 116
  // ════════════════════════════════════════════════════════

  '116-1': {
    unit: '116', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Wyoming Range north — moderate demand',
    description: 'Southwest Wyoming, north Wyoming Range. Draws at 4 points in regular pool with 13.33% odds. Moderate NR competition.',
    tier: 'accessible',
    coords: { lat: 42.85, lng: -110.55 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 56, approxOdds: '100%' },
        nr_regular: { quota: 7, minPoints: 4, oddsAtMin: '13.33%' },
        nr_special: { quota: 6, minPoints: 3, oddsAtMin: '20.0%' },
        nr_random: { quota: 2, firstChoiceApplicants: 110, approxOdds: '1.82%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 8, approxOdds: '12.50%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 117 — Wyoming Range South
  // ════════════════════════════════════════════════════════

  '117-1': {
    unit: '117', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Wyoming Range south — solid bulls, moderate pressure',
    description: 'Southwest Wyoming, southern Wyoming Range. Good bull numbers with moderate hunter pressure. Drawable for NR hunters with 8-9 points in the regular pool.',
    tier: 'mid',
    coords: { lat: 42.2, lng: -110.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 324, firstChoiceApplicants: 638, approxOdds: '50.79%' },
        nr_regular: { quota: 25, minPoints: 8, oddsAtMin: '91.67%' },
        nr_special: { quota: 17, minPoints: 6, oddsAtMin: '16.67%' },
        nr_random: { quota: 8, firstChoiceApplicants: 210, approxOdds: '3.81%' },
        nr_special_random: { quota: 5, firstChoiceApplicants: 43, approxOdds: '11.63%' },
      },
    ],
  },

  '117-3': {
    unit: '117', huntType: '3', huntTypeLabel: 'Spike - Rifle (Limited Quota)',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Spike management tag — Wyoming Range south',
    description: 'Unit 117 limited quota spike tag. Very low NR demand. Essentially guaranteed draw.',
    tier: 'accessible',
    coords: { lat: 42.2, lng: -110.6 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 339, firstChoiceApplicants: 25, approxOdds: '100%' },
        nr_regular: { quota: 42, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 18, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 13, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 118
  // ════════════════════════════════════════════════════════

  '118-1': {
    unit: '118', huntType: '1', huntTypeLabel: 'Antlered Elk - Rifle',
    typical: '290-320"', topEnd: '350"+',
    trait: 'Wyoming Range west — antlered bull tag',
    description: 'Southwest Wyoming. Antlered elk tag. Draws at 13 points in regular pool with 50% odds.',
    tier: 'mid',
    coords: { lat: 42.6, lng: -110.85 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 56, firstChoiceApplicants: 194, approxOdds: '28.87%' },
        nr_regular: { quota: 6, minPoints: 13, oddsAtMin: '50.0%' },
        nr_special: { quota: 4, minPoints: 11, oddsAtMin: '25.0%' },
        nr_random: { quota: 1, firstChoiceApplicants: 19, approxOdds: '5.26%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 10, approxOdds: '10.0%' },
      },
    ],
  },

  '118-4': {
    unit: '118', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 118 antlerless elk. Zero demand — guaranteed draw.',
    tier: 'antlerless',
    coords: { lat: 42.6, lng: -110.85 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 48, firstChoiceApplicants: 10, approxOdds: '100%' },
        nr_regular: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 3, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 120
  // ════════════════════════════════════════════════════════

  '120-1': {
    unit: '120', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '285-315"', topEnd: '345"+',
    trait: 'Wyoming Range west — high demand',
    description: 'Southwest Wyoming. High NR demand. Draws at 13 points in regular pool with 33.33% odds.',
    tier: 'mid',
    coords: { lat: 42.7, lng: -110.75 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 126, firstChoiceApplicants: 574, approxOdds: '21.95%' },
        nr_regular: { quota: 12, minPoints: 13, oddsAtMin: '33.33%' },
        nr_special: { quota: 8, minPoints: 10, oddsAtMin: '50.0%' },
        nr_random: { quota: 3, firstChoiceApplicants: 158, approxOdds: '1.90%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 28, approxOdds: '7.14%' },
      },
    ],
  },

  '120-4': {
    unit: '120', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 120 antlerless elk. Very low demand, drawable with zero points.',
    tier: 'antlerless',
    coords: { lat: 42.7, lng: -110.75 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 105, firstChoiceApplicants: 42, approxOdds: '100%' },
        nr_regular: { quota: 15, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 5, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 2, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 122
  // ════════════════════════════════════════════════════════

  '122-1': {
    unit: '122', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Wyoming Range north — moderate demand',
    description: 'Southwest Wyoming. Draws at 8 points in regular pool with 22.22% odds.',
    tier: 'mid',
    coords: { lat: 42.9, lng: -110.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 118, firstChoiceApplicants: 73, approxOdds: '100%' },
        nr_regular: { quota: 11, minPoints: 8, oddsAtMin: '22.22%' },
        nr_special: { quota: 8, minPoints: 8, oddsAtMin: '50.0%' },
        nr_random: { quota: 3, firstChoiceApplicants: 49, approxOdds: '6.12%' },
        nr_special_random: { quota: 2, firstChoiceApplicants: 34, approxOdds: '5.88%' },
      },
    ],
  },

  '122-2': {
    unit: '122', huntType: '2', huntTypeLabel: 'Antlered Five-Point - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Wyoming Range north five-point — essentially guaranteed draw',
    description: 'Unit 122 five-point antlered tag. Draws at 0 points. Very low NR demand.',
    tier: 'accessible',
    coords: { lat: 42.9, lng: -110.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 97, firstChoiceApplicants: 6, approxOdds: '100%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '100%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 4, firstChoiceApplicants: 0, approxOdds: null },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 123 — Hoback Basin
  // ════════════════════════════════════════════════════════

  '123-2': {
    unit: '123', huntType: '2', huntTypeLabel: 'Antlered Five-Point - Rifle',
    typical: '280-310"', topEnd: '340"+',
    trait: 'Hoback Basin five-point — accessible backcountry',
    description: 'West-central Wyoming, Hoback Basin. Draws at 7 points in regular pool with 50% odds. Good option for moderate-point hunters.',
    tier: 'accessible',
    coords: { lat: 43.1, lng: -110.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 35, firstChoiceApplicants: 122, approxOdds: '28.69%' },
        nr_regular: { quota: 3, minPoints: 7, oddsAtMin: '50.0%' },
        nr_special: { quota: 3, minPoints: 1, oddsAtMin: '100%' },
        nr_random: { quota: 0, firstChoiceApplicants: 45, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 7, approxOdds: null },
      },
    ],
  },

  '123-4': {
    unit: '123', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 123 antlerless elk. Moderate demand, drawable with 1 point.',
    tier: 'antlerless',
    coords: { lat: 43.1, lng: -110.1 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 63, firstChoiceApplicants: 30, approxOdds: '100%' },
        nr_regular: { quota: 9, minPoints: 1, oddsAtMin: '90.0%' },
        nr_special: { quota: 4, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 2, firstChoiceApplicants: 5, approxOdds: '40.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 124 — Jackson Hole / Teton
  // ════════════════════════════════════════════════════════

  '124-1': {
    unit: '124', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '340-370"', topEnd: '400"+',
    trait: 'Jackson Hole — Wyoming\'s most prestigious elk tag',
    description: 'Northwest Wyoming, Teton Wilderness and surrounding drainages. World-class trophy potential. Extremely limited NR quota. One of the hardest draws in the West. Draws at 18 points in regular pool with only 12% odds — the quintessential bucket-list Wyoming elk tag.',
    tier: 'trophy',
    coords: { lat: 43.85, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 35, firstChoiceApplicants: 905, approxOdds: '3.87%' },
        nr_regular: { quota: 3, minPoints: 18, oddsAtMin: '12.0%' },
        nr_special: { quota: 2, minPoints: 18, oddsAtMin: '14.29%' },
        nr_random: { quota: 0, firstChoiceApplicants: 177, approxOdds: null },
        nr_special_random: { quota: 0, firstChoiceApplicants: 62, approxOdds: null },
      },
    ],
  },

  '124-4': {
    unit: '124', huntType: '4', huntTypeLabel: 'Antlerless - Rifle',
    typical: 'N/A', topEnd: 'N/A',
    trait: 'Antlerless management tag',
    description: 'Unit 124 antlerless elk. Moderate NR demand given the unit\'s fame. Drawable with 0 points.',
    tier: 'antlerless',
    coords: { lat: 43.85, lng: -110.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 84, firstChoiceApplicants: 117, approxOdds: '71.79%' },
        nr_regular: { quota: 12, minPoints: 0, oddsAtMin: '42.86%' },
        nr_special: { quota: 6, minPoints: 0, oddsAtMin: '100%' },
        nr_random: { quota: 3, firstChoiceApplicants: 12, approxOdds: '25.0%' },
        nr_special_random: { quota: 1, firstChoiceApplicants: 0, approxOdds: null },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // UNIT 125 — Commissary Ridge
  // ════════════════════════════════════════════════════════

  '125-1': {
    unit: '125', huntType: '1', huntTypeLabel: 'Any Elk - Rifle',
    typical: '275-305"', topEnd: '335"+',
    trait: 'Commissary Ridge — drawable with low points',
    description: 'Southwest Wyoming, Commissary Ridge area. One of the most accessible NR limited units for low-point hunters. Draws at 4 points in regular pool. Good while building points for a premium unit.',
    tier: 'accessible',
    coords: { lat: 42.55, lng: -110.65 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 167, firstChoiceApplicants: 66, approxOdds: '100%' },
        nr_regular: { quota: 13, minPoints: 4, oddsAtMin: '11.11%' },
        nr_special: { quota: 9, minPoints: 1, oddsAtMin: '100%' },
        nr_random: { quota: 4, firstChoiceApplicants: 71, approxOdds: '5.63%' },
        nr_special_random: { quota: 3, firstChoiceApplicants: 5, approxOdds: '60.0%' },
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // GENERAL REGIONS
  // ════════════════════════════════════════════════════════

  'Region E': {
    unit: 'Region E', huntType: 'general', huntTypeLabel: 'General Region - Any Elk',
    typical: '260-300"', topEnd: '330"+',
    trait: 'General region — southeast Wyoming, best general region draw odds',
    description: 'Southeast Wyoming general elk region. Large quota with good access. NR hunters can draw via random pool at ~15% odds or with 4-5 special points. Best general region draw odds for NR hunters with zero points.',
    tier: 'general',
    coords: { lat: 41.8, lng: -105.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 99999, firstChoiceApplicants: 1253, approxOdds: '100%' },
        nr_regular: { quota: 244, minPoints: 5, oddsAtMin: '75.0%' },
        nr_special: { quota: 164, minPoints: 3, oddsAtMin: '86.36%' },
        nr_random: { quota: 81, firstChoiceApplicants: 534, approxOdds: '15.17%' },
        nr_special_random: { quota: 54, firstChoiceApplicants: 135, approxOdds: '40.0%' },
      },
    ],
  },

  'Region S': {
    unit: 'Region S', huntType: 'general', huntTypeLabel: 'General Region - Any Elk',
    typical: '260-295"', topEnd: '325"+',
    trait: 'General region — south Wyoming, higher NR demand',
    description: 'South Wyoming general elk region. High NR demand. NR hunters need 5 special points or ~6.4% random pool odds. Covers the southern reaches of the state.',
    tier: 'general',
    coords: { lat: 41.5, lng: -107.5 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 99999, firstChoiceApplicants: 1253, approxOdds: '100%' },
        nr_regular: { quota: 460, minPoints: 5, oddsAtMin: '92.88%' },
        nr_special: { quota: 308, minPoints: 2, oddsAtMin: '54.55%' },
        nr_random: { quota: 153, firstChoiceApplicants: 2393, approxOdds: '6.39%' },
        nr_special_random: { quota: 102, firstChoiceApplicants: 149, approxOdds: '68.46%' },
      },
    ],
  },

  'Region W': {
    unit: 'Region W', huntType: 'general', huntTypeLabel: 'General Region - Any Elk',
    typical: '265-305"', topEnd: '340"+',
    trait: 'General region — west Wyoming, largest NR quota in the state',
    description: 'West Wyoming general elk region. Largest NR quota of any Wyoming elk hunt. Covers diverse terrain from sage foothills to high alpine. NR random pool odds at ~9.75%. Best general region for quality and opportunity combined.',
    tier: 'general',
    coords: { lat: 42.8, lng: -110.4 },
    drawHistory: [
      {
        year: 2024,
        resident: { quota: 99999, firstChoiceApplicants: 1253, approxOdds: '100%' },
        nr_regular: { quota: 1215, minPoints: 4, oddsAtMin: '57.63%' },
        nr_special: { quota: 811, minPoints: 4, oddsAtMin: '91.56%' },
        nr_random: { quota: 405, firstChoiceApplicants: 4149, approxOdds: '9.76%' },
        nr_special_random: { quota: 270, firstChoiceApplicants: 1088, approxOdds: '24.82%' },
      },
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// HELPER: Build draw trend block for AI prompt generation
// ────────────────────────────────────────────────────────────────────────────

export function buildElkDrawTrendBlock(unit: WyoElkUnit, unitKey: string, residency: string): string {
  if (!unit.drawHistory || unit.drawHistory.length < 2) {
    const latest = unit.drawHistory?.[0];
    if (!latest) return '';
    const isResident = residency.toLowerCase().includes('resident');
    if (isResident) {
      return `
### DRAW DATA — RESIDENT (${latest.year}) ###
- Resident odds: ${latest.resident.approxOdds}
- Quota: ${latest.resident.quota}
- First Choice Applicants: ${latest.resident.firstChoiceApplicants}
      `;
    } else {
      return `
### DRAW DATA — NR (${latest.year}) ###
- NR Regular: min ${latest.nr_regular.minPoints ?? 'N/A'} pts, ${latest.nr_regular.oddsAtMin ?? 'N/A'} odds at min
- NR Special: min ${latest.nr_special.minPoints ?? 'N/A'} pts, ${latest.nr_special.oddsAtMin ?? 'N/A'} odds at min
- NR Random: ${latest.nr_random.approxOdds ?? 'N/A'} (${latest.nr_random.quota} tags / ${latest.nr_random.firstChoiceApplicants} applicants)
- NR Special Random: ${latest.nr_special_random.approxOdds ?? 'N/A'} (${latest.nr_special_random.quota} tags / ${latest.nr_special_random.firstChoiceApplicants} applicants)
      `;
    }
  }

  const sorted = [...unit.drawHistory].sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  const prior = sorted[1];
  const isResident = residency.toLowerCase().includes('resident');

  if (isResident) {
    const change = latest.resident.approxOdds !== prior.resident.approxOdds
      ? `changed from ${prior.resident.approxOdds} to ${latest.resident.approxOdds}`
      : 'remained stable';
    return `
### DRAW TREND — RESIDENT (${prior.year} → ${latest.year}) ###
- Resident odds ${change}
- Quota: ${prior.resident.quota} → ${latest.resident.quota}
- First Choice Applicants: ${prior.resident.firstChoiceApplicants} → ${latest.resident.firstChoiceApplicants}
    `;
  } else {
    return `
### DRAW TREND — NR (${prior.year} → ${latest.year}) ###
- NR Random odds: ${prior.nr_random.approxOdds ?? 'N/A'} → ${latest.nr_random.approxOdds ?? 'N/A'}
- NR Regular min points: ${prior.nr_regular.minPoints ?? 'N/A'} → ${latest.nr_regular.minPoints ?? 'N/A'}
- NR Special min points: ${prior.nr_special.minPoints ?? 'N/A'} → ${latest.nr_special.minPoints ?? 'N/A'}
- NR Special Random odds: ${prior.nr_special_random.approxOdds ?? 'N/A'} → ${latest.nr_special_random.approxOdds ?? 'N/A'}
    `;
  }
}