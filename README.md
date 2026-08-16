# carb-tesla-app — two domains, one project

Serves **carbcleantruckcheck.app** (Find a Tester) and
**cleantruckcheckvin.app** (Compliance Hub + VIN decode) from the same
static tree.

## Domains

| Host | Homepage | Notes |
| --- | --- | --- |
| `carbcleantruckcheck.app` | Find a Tester (`index.html`) | VIN check lives on `/vin/` as a second page |
| `cleantruckcheckvin.app` | Compliance Hub (`vin/index.html`) | `functions/_middleware.js` rewrites `/` to the hub. If Functions are off, `index.html` redirects to `/vin/` |

The hub look (navy glass, metallic buttons) is intentional: it is not the
brown/gold city-booking template used on Hayward, Lodi, and the other
satellite sites.

## VIN lookup

`vin.js` calls NHTSA vPIC (`decodevin`) in the browser. CORS is open.
It reads **`Error Code`** (with a space) — the AI Studio prototype looked
for `ErrorCode` and treated every successful decode as a miss.

What the page will and will not do:

- Will: year / make / model / fuel / GVWR, then a rule-of-thumb test
  (2013+ diesel → HD-OBD $119, 2012- diesel → OVI $219).
- Will not: claim CTC-VIS pass/fail. That is CARB's registry, not NHTSA.
- Will not: Gemini camera OCR or Google Maps tester search (those need a
  live API key and would also send people to outside shops).

## How tester routing works

- City teams (Roseville, Stockton, Lodi, Fairfield, Hayward, Sacramento/NorCal)
  each cover a ~50-mile radius of their city.
- Mobile CARB Testing — San Diego covers **San Diego County only**, no
  radius spillover.
- Anywhere else in California falls back to statewide OVI dispatch
  (Mobile OVI Test) and the dispatch phone line.
- Visitors can share their browser location or pick a city/region from the
  dropdown. Location is used in-browser only.

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

Attach both custom domains to the same Pages project. VIN lookup has no
server secret; NHTSA is called from the browser.
