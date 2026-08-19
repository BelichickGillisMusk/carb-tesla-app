# carb-tesla-app — two domains, one project

Serves **carbcleantruckcheck.app** (Find a Tester) and
**cleantruckcheckvin.app** (Compliance Hub + VIN decode) from the same
static tree. The navy hub is a working rebuild of the Google AI Studio
prototype currently live on those Vercel domains.

## Domains

| Host | Homepage | Notes |
| --- | --- | --- |
| `carbcleantruckcheck.app` | Find a Tester (`index.html`) | VIN hub is the **second page** at `/vin/`. After a successful decode, ZIP / location finder is on that same page. |
| `cleantruckcheckvin.app` | Compliance Hub (`vin/index.html`) | `functions/_middleware.js` rewrites `/` to the hub. If Functions are off, `index.html` redirects to `/vin/` |

The hub look (navy glass, metallic buttons, MOBILE / CARB lockup) is
intentional: it is not the brown/gold city-booking template used on
Hayward, Lodi, and the other satellite sites.

## VIN lookup

`vin.js` calls NHTSA vPIC (`decodevin`) in the browser. CORS is open.
It reads **`Error Code`** (with a space) — the AI Studio prototype looked
for `ErrorCode` and treated every successful decode as a miss.

What the page will and will not do:

- Will: year / make / model / fuel / GVWR, then a rule-of-thumb test
  (2013+ diesel → HD-OBD $119, 2012- diesel → OVI $219).
- Will: ZIP lookup (Zippopotam) and in-network tester routing after a
  decode — same coverage rules as the homepage finder.
- Will not: claim CTC-VIS pass/fail. The prototype used the last VIN
  digit (even = "compliant") — that overlay is gone.
- Will not: Gemini camera OCR or Google Maps tester search (those need a
  live API key and would also send people to outside shops).

## How tester routing works

- City teams (Roseville, Stockton, Lodi, Fairfield, Hayward, Sacramento/NorCal)
  each cover a ~50-mile radius of their city.
- Mobile CARB Testing — San Diego covers **San Diego County only**, no
  radius spillover.
- Anywhere else in California falls back to statewide OVI dispatch
  (Mobile OVI Test) and the dispatch phone line.
- Visitors can share a ZIP, browser location, or pick a city/region.
  Location is used in-browser only.

## Hayward / Lodi — should this replace those sites?

**No — use this hub as the flagship tool, not as the new city template.**

Hayward, Lodi, Roseville, and Fairfield already look like the same
booking page with the city name, phone, and OBD price swapped. Dropping
this navy hub onto Hayward or Lodi would fix *that* sameness for a week,
then every city site would look like the hub.

Better split:

| Role | Site | Why |
| --- | --- | --- |
| Statewide tool | `cleantruckcheckvin.app` + `carbcleantruckcheck.app` | Unique utility: decode + route. This look belongs here. |
| Local storefront | Hayward, Lodi, Roseville, etc. | Phone, local price, coverage, booking form. Differentiate with local proof, not another clone of this hub. |

If one city should stop looking templated, give **Lodi** a distinct local
page (ag/winery fleet story, 209 number, $89 OBD) and leave Hayward as
the East Bay booking page. Point both at this VIN hub instead of
duplicating it.

Do **not** point city “find a tester” at Gemini/Google Maps. That was the
other landmine in the AI Studio app: it would surface random credentialed
testers, not the network.

## Editing the site list

The directory lives at the top of `site.js` (`SITES` array) — name, url,
blurb, city coordinates, radius. The finder, the network grid, and the
dispatch assistant all read from that one list. `CITIES` in the same file
feeds the dropdown.

**TODO:** confirm the Stockton URL (`cleantruckcheckstockton.com` is a
placeholder guess).

## Files

- `index.html` — Find a Tester homepage (carbcleantruckcheck.app)
- `vin/index.html` + `vin.css` + `vin.js` — Compliance Hub / VIN decode
- `answers/index.html` — FAQ
- `styles.css` / `site.js` — finder theme, network directory, dispatch widget
- `functions/_middleware.js` — VIN-domain homepage rewrite
- `marketing/` — paste-ready link blocks

## Deploy

```bash
wrangler pages deploy . --project-name=<cloudflare-project> --commit-dirty=true
```

Attach both custom domains to the same Pages project (they currently
still serve the AI Studio React bundle from Vercel). VIN lookup has no
server secret; NHTSA and Zippopotam are called from the browser.

```bash
python3 scripts/test-vin.py
```
