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
- **Shared crew list.** Sign in with your email, start a crew, and send friends an invite link. Everyone in the crew sees the same bartenders, and changes show up on everyone's phone live
- **Export/import** a JSON file as a backup. An import merges lists and keeps the newest version of each person

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the keys you have
npm run dev
```

The app adapts to what's configured:

| Configured | What you get |
| --- | --- |
| Nothing | Works on one device, saved in the browser. Places are typed in by hand. |
| Supabase | Sign-in, crews, and the shared live list. |
| Google Maps | Place search, the map, and "Who works here?". |

## Setting up for the crew

You do this once. It takes about 20 minutes.

### 1. Supabase (the shared database)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Create the tables.** Open **SQL Editor**, paste in the whole of `supabase/migrations/20261003000000_crews_and_bartenders.sql`, and click **Run**.
3. **Get the keys.** Under **Project Settings → API Keys**, copy the **Project URL** and the **publishable** key (older projects call it the "anon public" key). These two go in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. **Never** use the secret / `service_role` key in this app.
4. **Set the sign-in redirect.** Under **Authentication → URL Configuration**:
   - Site URL: your Vercel address, e.g. `https://have-you-been-there.vercel.app`
   - Redirect URLs: add `https://have-you-been-there.vercel.app/**` and `http://localhost:5173/**`
5. **Set up email sending (required for friends).** Supabase's built-in email only sends to members of your Supabase team, and only 2 per hour. Your friends can't sign in until you connect your own email sender under **Authentication → Emails → SMTP Settings**. The easiest option without your own domain is a Gmail account:
   - Turn on 2-Step Verification for the Gmail account, then create an [App Password](https://myaccount.google.com/apppasswords).
   - SMTP settings: host `smtp.gmail.com`, port `587`, username = the Gmail address, password = the app password, sender = the same Gmail address.
   - Then raise the limit under **Authentication → Rate Limits** (custom SMTP starts at 30 emails per hour, which is plenty for a crew).
6. **Add the sign-in code to the email (recommended).** Once SMTP is connected you can edit templates. Under **Authentication → Emails → Templates**, paste `supabase/templates/magic_link.html` into both **Magic Link** and **Confirm signup**. This adds a 6-digit code to the email. The code is easier than the link when the app is saved to your phone's home screen, because the link may open in a different browser.

### 2. Vercel (the website)

1. Sign in at [vercel.com](https://vercel.com) with GitHub, click **Add New → Project**, and pick this repo. It detects Vite on its own.
2. Under **Environment Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and (when you have it) `VITE_GOOGLE_MAPS_API_KEY`.
3. Deploy. If the address it gives you differs from the one you used in Supabase step 4, update it there.

Every push to the main branch redeploys the site. Other branches get their own preview URL. Previews can't sign in unless you also add their address to Supabase's Redirect URLs.

### 3. Google Maps (optional, but most of the magic)

1. In the [Google Cloud console](https://console.cloud.google.com/google/maps-apis), create a project and enable **Maps JavaScript API** and **Places API (New)**.
2. Create an API key and **restrict it to HTTP referrers**: your Vercel address plus `http://localhost:5173/*`. The key ships to the browser, so the restriction is what protects it.
3. Add it as `VITE_GOOGLE_MAPS_API_KEY` (locally in `.env.local`, and in Vercel).
4. (Optional) Create a Map ID and set `VITE_GOOGLE_MAPS_MAP_ID`. If you skip it, Google's `DEMO_MAP_ID` is used.

Place search uses Places Autocomplete (New) with session tokens, so a search plus a pick is billed as one session. Light personal use fits easily inside Google's free monthly credit.

### 4. Invite the crew

Sign in on the live site, start your crew, then go to the **Crew** tab and share the invite link. Anyone with the link can join, so only send it to the crew. If it ends up somewhere it shouldn't, tap **Reset invite link** and the old one stops working.

If you logged bartenders before setting this up, the Crew tab offers to add them from your phone to the crew's list.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Checks the database access rules on a throwaway local Postgres |
| `npm run db:start` / `db:stop` | Run a full local Supabase in Docker (sign-in emails show up at http://127.0.0.1:54324) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build into `dist/` |

## How it's built

React + TypeScript + Vite, with [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) for Maps and Places, and [Supabase](https://supabase.com) for sign-in, the shared database, and live updates. Hosted on Vercel.

```
src/
  lib/
    types.ts      data model (Bartender, Place, Recommendation, Sighting)
    storage.ts    BartenderStore interface + on-device (localStorage) implementation
    supabaseStore.ts  the crew's shared list: instant local updates, background saves, Realtime sync
    rows.ts       database row mapping; works out the smallest set of writes for each edit
    session.tsx   sign-in, crews, invites
    store.ts      whichever store is active + React hooks
    bars.ts       group bartenders by bar, nearby-bar lookup
    util.ts       search matching, distance, dates, Google Maps links
  components/     PlaceInput (Google autocomplete / manual fallback), cards, forms
  pages/          People, Bartender detail/edit, Bars, Map, Crew, Sign in, Crew setup
supabase/
  migrations/     tables, access rules (Row Level Security), and crew functions
  tests/          access-rule tests (run with npm run test:db)
  templates/      sign-in email with a link and a code
```

**Who can see what.** The browser only ever has the public Supabase key, so the database rules do the protecting. You can only read or change a crew's bartenders if you're a member, and the only ways in are starting a crew or using its invite code. `npm run test:db` checks each of these rules: outsiders see nothing, can't add themselves, can't attach data to another crew's bartenders, and so on.

**Editing at the same time.** Each edit saves only what changed. If two friends add a sighting or tick a different rec at the same moment, both changes stick.

## Roadmap

**Phase 1: MVP ✅** Log bartenders, recs, and sightings. Search, bars view, map, near-me lookup, JSON export/import.

**Phase 2: shared crew list ✅** Email sign-in, crews with invite links, a shared list with live updates, and per-crew access rules.
- Next: show who added each sighting and rec (the database already records it), and make favorites per person instead of shared.

**Phase 3: phone-first polish.**
- Make it an installable PWA (manifest + service worker) so it sits on the home screen and works with bad bar Wi‑Fi. Right now an edit made with no signal shows an error and is lost on refresh.
- Log someone in about 10 seconds: prefill the bar from your current location (Places Nearby Search), then just type a name.
- "Haven't seen them in a while" nudges.
- Optional photo, only if the bartender agrees. The appearance notes cover most of this without the awkwardness.

**Phase 4: nice-to-haves.**
- A recs-to-try list across everyone, sorted by distance, for planning a night out.
- A "who to look for" view for tonight's plan: pick bars and get a cheat sheet of names.
- A note when someone moves to a new bar (keep a work history instead of a single bar).

## Privacy note

This is a notebook about real people, so keep it kind and keep it within the crew. Don't store anything you wouldn't be comfortable with the bartender reading.
