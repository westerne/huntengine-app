// app/api/strategy/data.ts

export type UnitStats = {
  typical: string;
  topEnd: string;
  trait: string;
};

export const HUNT_DATA: Record<string, Record<string, UnitStats>> = {
  UTAH_ELK: {
    // --- TIER 1: THE PREMIUM GIANTS (Age Objective 7.5 - 8.0) ---
    "Beaver, East": { typical: '340-360"', topEnd: '390"+', trait: "Massive alpine frames; legendary Tushar mass." },
    "Plateau, Boulder": { typical: '350-370"', topEnd: '400"+', trait: "Extreme beam length; hides in thick timber." },
    "Fillmore, Pahvant": { typical: '340-355"', topEnd: '385"', trait: "High symmetry; the gold standard for clean 6x6s." },
    "San Juan": { typical: '345-365"', topEnd: '400"+', trait: "The best genetics in the West; massive 5th/6th points." },
    "Book Cliffs, Little Creek": { typical: '320-340"', topEnd: '360"', trait: "Roadless backcountry; high age class but moderate mass." },
    "Oak Creek": { typical: '165-180"', topEnd: '210"', trait: "High density; excellent for seeing many 170+ class bucks." },

    // --- TIER 2: HIGH QUALITY (Age Objective 6.5 - 7.0) ---
    "Monroe": { typical: '330-350"', topEnd: '380"', trait: "Incredible royal (4th) points; very steep terrain." },
    "Mt Dutton": { typical: '325-345"', topEnd: '375"', trait: "Rugged desert timber; bulls live to old ages here." },
    "Southwest Desert": { typical: '330-350"', topEnd: '380"', trait: "Isolated desert mountains; long sweeping beams." },
    "Panguitch Lake": { typical: '315-335"', topEnd: '360"', trait: "Heavy lava rock terrain; strong beam mass." },
    "Cache, South": { typical: '310-330"', topEnd: '355"', trait: "Consistent 6x6 genetics; heavy timber dwellers." },
    "Cache, Meadowville": { typical: '305-325"', topEnd: '345"', trait: "Agriculture-fed bulls; good mass but higher pressure." },
    "Book Cliffs, Bitter Creek": { typical: '315-335"', topEnd: '355"', trait: "High density; great for seeing many 300-class bulls." },
    "South Slope, Diamond Mtn": { typical: '310-330"', topEnd: '350"', trait: "Sage/Rimrock country; high visibility glassing." },

    // --- TIER 3: POPULAR LE UNITS (Age Objective 5.5 - 6.0) ---
    "Wasatch Mtns": { typical: '310-330"', topEnd: '365"', trait: "Massive herds; wide spreads; the 'Classic' Utah hunt." },
    "Central Mtns, Manti": { typical: '310-330"', topEnd: '360"', trait: "Huge area; rugged canyons; bulls find deep holes to age." },
    "Central Mtns, Nebo": { typical: '315-335"', topEnd: '365"', trait: "High protein oak brush; very strong antler growth." },
    "Plateau, Fishlake": { typical: '305-325"', topEnd: '355"', trait: "High visibility; excellent for glassing and stalking." },
    "La Sal, La Sal Mtns": { typical: '310-330"', topEnd: '360"', trait: "High alpine island genetics; dark, heavy antlers." },
    "North Slope, Three Corners": { typical: '290-315"', topEnd: '340"', trait: "Migratory bulls; relies on weather to move elk in." },

    // --- TIER 4: SPECIALTY & OPPORTUNITY ---
    "Box Elder, Pilot Mtn": { typical: '310-330"', topEnd: '350"', trait: "Desert island range; extremely remote." },
    "West Desert, Deep Creek": { typical: '320-340"', topEnd: '370"', trait: "Nevada border genetics; isolated and rugged." },
    "Nine Mile, Anthro": { typical: '305-325"', topEnd: '350"', trait: "High desert canyons; very sharp, ivory-tipped tines." },
    "Paunsaugunt": { typical: '290-310"', topEnd: '340"', trait: "Primarily a deer unit; elk are low density but older." },

    // --- TIER 5: GENERAL ANY BULL UNITS ---
    "North Slope, High Uintas": { typical: '250-280"', topEnd: '310"', trait: "Wilderness meat hunt; heavy timber and high peaks." },
    "South Slope, Yellowstone": { typical: '260-285"', topEnd: '320"', trait: "Foothill genetics; high pressure during rifle." },
    "Pine Valley": { typical: '270-295"', topEnd: '330"', trait: "Thick brush; difficult tracking; localized success." }
  }
  UTAH_DEER: {
    // --- TIER 1: THE PREMIUM LEGENDS (World Class Potential) ---
    "Henry Mtns": { typical: '180-200"', topEnd: '230"+', trait: "World-record genetics; deep forks and massive frames." },
    "Paunsaugunt": { typical: '175-195"', topEnd: '220"+', trait: "Migratory giants; famous for extreme width and mass." },
    "Antelope Island": { typical: '190-210"', topEnd: '250"+', trait: "Isolated island giants; ultra-managed for age." },

    // --- TIER 2: LIMITED ENTRY (The 170-180" Class) ---
    "Book Cliffs": { typical: '150-165"', topEnd: '185"', trait: "High deer density; great for deep-forked typicals." },
    "West Desert, Vernon": { typical: '160-175"', topEnd: '190"', trait: "Classic desert hunt; bucks with heavy sage-brush mass." },
    "San Juan, Elk Ridge": { typical: '165-180"', topEnd: '200"+', trait: "Rugged ponderosa country; high-scoring typical potential." },
    "Dolores Triangle": { typical: '155-170"', topEnd: '185"', trait: "Late season hunt; relies on winter migration from Colorado." },

    // --- TIER 3: TOP GENERAL SEASON UNITS (The 150-170" Class) ---
    "Pine Valley": { typical: '140-160"', topEnd: '185"', trait: "High-country basins; produces some of the state's largest general bucks." },
    "Zion": { typical: '145-165"', topEnd: '180"', trait: "Rugged rimrock; bucks utilize private land to reach older age classes." },
    "Plateau, Boulder": { typical: '140-160"', topEnd: '175"', trait: "High-elevation summer range; excellent velvet growth potential." },
    "Panguitch Lake": { typical: '145-160"', topEnd: '180"', trait: "Heavy lava rock; creates sanctuary areas for mature bucks." },
    "Wasatch Mtns, West": { typical: '135-155"', topEnd: '170"', trait: "Extremely rugged; requires deep hiking to escape pressure." },

    // --- TIER 4: NORTHERN RECOVERY UNITS (Lower Density / Younger Age) ---
    "Cache": { typical: '120-145"', topEnd: '165"', trait: "Currently recovering from hard winters; focus on younger age classes." },
    "Ogden": { typical: '125-145"', topEnd: '170"', trait: "High pressure but incredible rough-country escape terrain." },
    "Chalk Creek": { typical: '130-150"', topEnd: '175"', trait: "High private land influence; mature bucks often reside on ranches." },

    // --- TIER 5: SPECIALTY HUNTS ---
    "La Sal, Dolores Triangle": { typical: '160-175"', topEnd: '190"', trait: "Late-season rut hunt; iconic wide desert frames." },
    "San Rafael, North": { typical: '130-150"', topEnd: '170"', trait: "Low density but very high trophy-to-doe ratios." }
  }
  },
  WYOMING_ELK: {
    "Unit 100": { typical: '310-330"', topEnd: '370"', trait: "High desert genetics" },
    "Unit 124": { typical: '300-320"', topEnd: '340"', trait: "Migration corridor focus" },
  },
  IDAHO_ELK: {
    "Unit 54": { typical: '280-310"', topEnd: '340"', trait: "High desert canyon residents" },
  }
};