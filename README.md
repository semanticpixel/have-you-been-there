# Have You Been There? 🍸

A little app for remembering bartenders' names, so the next time you walk in you can greet them by name.

For each bartender you log:

- **Name**, plus how to pronounce it
- **Where they work**: a Google Maps place, so we know exactly which bar
- **What they look like**, so you can recognize them again ("curly red hair, koi tattoo sleeve")
- **Vibe** tags (Chatty, Cocktail nerd, Heavy pour…) and free-form notes
- **Recommendations** they gave you: drinks, other bars, food spots. Each one can have its own Google Maps place and a "tried it" checkbox
- **History**: when you first met (and who in the crew met them), plus every "saw them again today"

Other features:

- **📍 Who works here?** uses your phone's location to list the bartenders you know at bars within 250 m
- **Search across everything.** "koi", "mezcal" or "Dead Rabbit" all find the right person
- **Bars view** groups people by the bar they work at
- **Map** of every bar (amber) and every recommended spot (teal)
- **Export/import** a JSON file to share your list with friends. An import merges lists and keeps the newest version of each person

## Running it

```bash
npm install
cp .env.example .env.local   # optional, add your Google Maps key
npm run dev
```

The app works without a Google key. Places are then typed in by hand, and the map and "who works here" features have no coordinates to use.

### Google Maps setup

1. In the [Google Cloud console](https://console.cloud.google.com/google/maps-apis), create a project and enable **Maps JavaScript API** and **Places API (New)**.
2. Create an API key and **restrict it to HTTP referrers** (`http://localhost:5173/*` plus your production domain). The key ships to the browser, so the restriction is what protects it.
3. Put it in `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`.
4. (Optional) Create a Map ID and set `VITE_GOOGLE_MAPS_MAP_ID`. If you skip it, Google's `DEMO_MAP_ID` is used.

Place search uses Places Autocomplete (New) with session tokens, so a search plus a pick is billed as one session. Light personal use fits easily inside Google's free monthly credit.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build into `dist/` |

## How it's built

React + TypeScript + Vite, with [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) for Maps and Places.

```
src/
  lib/
    types.ts      data model (Bartender, Place, Recommendation, Sighting)
    storage.ts    BartenderStore interface + localStorage implementation + import merge
    store.ts      app-wide store instance and React hooks
    bars.ts       group bartenders by bar, nearby-bar lookup
    util.ts       search matching, distance, dates, Google Maps links
  components/     PlaceInput (Google autocomplete / manual fallback), cards, forms
  pages/          People, Bartender detail/edit, Bars, Map, Crew (settings)
```

Right now the data lives in each device's `localStorage`. All reads and writes go through the `BartenderStore` interface in `src/lib/storage.ts`, so moving to a shared backend means writing a new implementation of that interface. The UI doesn't need to change.

## Roadmap

**Phase 1: MVP (this commit).** Log bartenders, recs, and sightings. Search, bars view, map, near-me lookup, JSON export/import.

**Phase 2: a shared crew list.** Today each friend has a separate copy, and that's the biggest gap.
- Add a backend. Supabase (Postgres + auth + realtime) or Firebase both fit, and both are free at this scale.
- Magic-link login and a "crew" with an invite link. Everyone in a crew sees and edits the same bartenders.
- Keep `metBy` and add `updatedBy` so you can see who added what.
- The `updatedAt` merge already used for imports becomes the conflict rule for offline edits.

**Phase 3: phone-first polish.**
- Make it an installable PWA (manifest + service worker) so it sits on the home screen and works with bad bar Wi‑Fi.
- Log someone in about 10 seconds: prefill the bar from your current location (Places Nearby Search), then just type a name.
- "Haven't seen them in a while" nudges.
- Optional photo, only if the bartender agrees. The appearance notes cover most of this without the awkwardness.

**Phase 4: nice-to-haves.**
- A recs-to-try list across everyone, sorted by distance, for planning a night out.
- A "who to look for" view for tonight's plan: pick bars and get a cheat sheet of names.
- A note when someone moves to a new bar (keep a work history instead of a single bar).

## Privacy note

This is a notebook about real people, so keep it kind and keep it within the crew. Don't store anything you wouldn't be comfortable with the bartender reading.
