# Application data format (lib/huntdata/apply/<st>.json)

One file per state. Official agency sources only; every fact keeps its source URL and a short quote. Owner signs off before the app uses it.

```json
{
  "state": "WY",
  "checkedOn": "2026-11-04",
  "applyUrl": "https://… (where you apply online)",
  "howToUrl": "https://… (agency page explaining the draw/application)",
  "draws": [
    {
      "name": "Nonresident elk, deer, pronghorn — primary draw",
      "species": ["ELK", "DEER", "ANTELOPE"],
      "residency": "resident" | "nonresident" | "both",
      "year": 2027,
      "status": "published" | "last_year",
      "opens": "YYYY-MM-DD" | null,
      "deadline": "YYYY-MM-DDTHH:MM" | "YYYY-MM-DD" | null,
      "timezone": "America/Denver" | null,
      "resultsBy": "YYYY-MM-DD" | null,
      "source": "https://…",
      "quote": "…"
    }
  ],
  "pointOnly": [
    { "name": "Preference point only", "species": ["ELK"], "residency": "both", "year": 2027, "status": "published" | "last_year",
      "opens": null, "deadline": null, "source": "…", "quote": "…" }
  ],
  "fees": [
    { "item": "application fee" | "point fee" | "tag fee" | "qualifying license" | "other",
      "label": "Nonresident elk point",
      "species": ["ELK"], "residency": "resident" | "nonresident" | "both",
      "amount": 52.00, "year": 2026, "refundable": true | false | null,
      "notes": "plain text or null", "source": "…", "quote": "…" }
  ],
  "prerequisites": [
    { "text": "You must hold a current hunting license to apply", "residency": "both", "species": ["ALL"] | ["ELK"], "source": "…", "quote": "…" }
  ],
  "notes": "Anything uncertain, blocked or not yet published — say so plainly."
}
```

Rules:
- `status: "published"` only for dates the agency has posted for the 2027 season. If 2027 isn't posted yet, record the 2026 dates with `year: 2026, status: "last_year"`. Never present last year's date as this year's.
- Fees: the current posted amount with the year it applies to. If only last year's schedule is posted, say so via `year`.
- Species keys: DEER, ELK, ANTELOPE, MOOSE, BIGHORNSHEEP, MTNGOAT, CARIBOU, DALLSHEEP, BISON, MUSKOX, ALL.
- `"basis": "computed_from_rule"` marks a date worked out from a regulation's formula (e.g. "first Monday in June") rather than copied from a posted schedule. The app must present it as expected, not published.
- `residency: null` means the agency doesn't say; never guess.
- If something can't be verified (site blocks automated access, scanned PDF), leave it out and explain in `notes`.
