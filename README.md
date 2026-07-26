# carb-tesla-app — carbcleantruckcheck.app

The CARB Clean Truck Check app: a **Find a Tester** front page that routes
visitors to the network's own sites only — never to outside testers.

## How routing works

- City teams (Roseville, Stockton, Fairfield, Hayward, Sacramento/NorCal)
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
dispatch assistant all read from that one list, so adding a site there
updates everything. `CITIES` in the same file feeds the dropdown.

**TODO:** confirm the Stockton URL (`cleantruckcheckstockton.com` is a
placeholder guess) and add the remaining network sites to `SITES`.

## Files

- `index.html` — app front page (Find a Tester, network grid, pricing)
- `answers/index.html` — FAQ page, same theme as the front page
- `styles.css` / `site.js` — shared theme and behavior for every page
- `marketing/` — paste-ready link blocks for blogs, the Google Business
  Profile, and outgoing email signatures

## Deploy

```bash
wrangler pages deploy . --project-name=<cloudflare-project> --commit-dirty=true
```
