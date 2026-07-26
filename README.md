# carb-tesla-app

Fixed build of the **mobilecarbsmoketest.com** lander (San Diego mobile CARB testing).

What this version adds over the original single-file site:

- `styles.css` — the shared theme the pages were already linking to but which was
  missing from the repo (the live page rendered unstyled without it).
- `site.js` — the dispatch assistant (agent) widget on every page, plus
  geolocation-aware satellite-site links.
- `answers/index.html` — the `/answers/` page the nav linked to but which did not
  exist. It uses the same header, footer, and theme as the homepage.
- Satellite network links (footer + Locations section): Roseville, Fairfield,
  Hayward, NorCal CARB Mobile, Mobile OVI Test. When a visitor shares their
  location, sites within ~60 miles are highlighted and sorted by distance.

- Prices on page: OBD $119 · OVI $219
- Dispatch: 415-900-8563 · dispatch@mobilecarbtesting.com

## Deploy

```bash
wrangler pages deploy . --project-name=mobile-carb-smoke-test --commit-dirty=true
```
