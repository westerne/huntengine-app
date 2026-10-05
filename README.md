# HuntQuarters (HuntEngine)

AI hunt planning for western big game hunters. **SCOUT** picks units that fit your points, budget and goals. **BRIEF** writes a full plan for one unit. The e-scouting map shows unit boundaries, public land and access.

See [ROADMAP.md](ROADMAP.md) for what's built and what's next.

## Run it locally

```bash
npm install
npm run dev
```

You need a `.env.local` file with:

- `OPENAI_API_KEY`: required. Used for SCOUT and BRIEF.
- `BETA_ACCESS_CODE`: the code testers type in to get past the gate.

Set the same values in the Vercel project settings.

## Where things live

- `app/planner/page.tsx` — the planner (also served at `/`)
- `app/api/strategy/` — SCOUT and BRIEF, prompt builder, and the draw data for each state
- `app/api/boundary`, `access`, `ownership` — map data (unit boundaries, OSM access, BLM land)
- `app/UnitMap.tsx` — the Leaflet map
- `lib/` — beta gate, rate limit, public-land math
