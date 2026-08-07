# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`carb-tesla-app` is the static site for **carbcleantruckcheck.app** — a "Find a Tester"
front page that routes visitors to the CARB Clean Truck Check network's own affiliated
sites only, never to outside/competing testers. There is no backend, build step, or
package manager: it's plain HTML/CSS/JS served as static files.

## Commands

- **Local preview:** open `index.html` directly in a browser, or serve the directory
  with any static file server (e.g. `python3 -m http.server`). No install step needed.
- **Deploy:** `./deploy.sh`, which runs:
  ```bash
  wrangler pages deploy . --project-name=mobile-carb-smoke-test --commit-dirty=true
  ```
  Deploys to Cloudflare Pages at `mobile-carb-smoke-test.pages.dev`. Requires `wrangler`
  authenticated against the Cloudflare account.
- There are no tests, linters, or build commands — there's nothing to compile.

## Architecture

Everything of substance lives in one file: **`site.js`**. All three pages (`index.html`,
`answers/index.html`, and any future page) load `styles.css` and `site.js` and share the
same theme and behavior.

### The site directory (single source of truth)

`site.js` defines a `SITES` array at the top — each entry has `name`, `url`, `blurb`,
`lat`/`lon` (city center), `radiusMiles`, and `coverage` (`"radius"`, `"county"`, or
`"statewide"`). **This one array drives everything**: the Find a Tester tool, the full
network grid on the homepage footer, and the dispatch assistant's "tester near me"
answers. To add or edit a network site, only `SITES` needs to change — do not duplicate
site info elsewhere.

`CITIES` (also in `site.js`) is a separate list of city names + coordinates used only to
populate the "pick your area" dropdown for visitors who don't share browser location.

### Coverage matching logic

`findSites(lat, lon)` (in `site.js`) computes haversine distance (`milesBetween`) from a
point to every site with coordinates, filters to sites within their own `radiusMiles`,
and separately collects any `coverage: "statewide"` sites as a fallback. Sites with
`coverage: "county"` (currently the San Diego site) are matched by radius like any other
site but are documented as having no radius spillover — i.e. their `radiusMiles` should
stay bounded to the county. Statewide sites (`lat`/`lon` are `null`) are always offered
as the fallback when no radius match is found.

### Three consumers of `findSites`/`SITES`

1. **Find a Tester widget** (`[data-finder]` block in `index.html`) — geolocation button
   or city dropdown calls `renderFinderResults`, which renders matched sites as cards,
   closest first, with a statewide/dispatch fallback card if nothing matches.
2. **Network grid** (`[data-satellite-grid]` in `index.html` footer) — renders every site
   in `SITES` unconditionally, no filtering.
3. **Dispatch assistant widget** — a self-contained chat-style widget built entirely by
   `buildWidget()` in `site.js` (launcher button + panel injected via JS, not present in
   the HTML). It answers canned questions by regex-matching user input against the
   `RESPONSES` table (pricing, which test type, booking, deadlines, greeting). The
   "nearest tester" intent (`match` for near/nearby/city names/etc.) is special-cased as
   `"__GEO__"`: it triggers a fresh geolocation request and calls `nearestSiteReply`,
   which reuses `findSites`. Unmatched questions fall through to `FALLBACK` (call/email
   dispatch).

### Adding a new page

Copy the `<head>` boilerplate (theme CSS variables, `styles.css`/`site.js` links, meta
tags) and the header/nav markup from `answers/index.html` — it's the minimal template
without the homepage's structured data and hero content. Every page must load
`site.js` for the dispatch assistant widget to appear, and pages that want the Find a
Tester tool need a `[data-finder]` container with `[data-finder-city]`,
`[data-finder-geo]`, `[data-finder-results]`, and `[data-finder-note]` child elements
(see `index.html`'s `#find` section for the exact structure `site.js` expects).

### Business facts baked into the code

Pricing ($119 HD-OBD for 2013+ diesel, $219 OVI smoke/opacity for 2012-and-older diesel)
and the dispatch phone/email (`415-900-8563`, `dispatch@mobilecarbtesting.com`) are
hardcoded in `site.js`'s `RESPONSES` table and in `index.html`'s structured data/markup.
If these change, update both places.

## Known open item

The Stockton site URL (`cleantruckcheckstockton.com`) in `SITES` is a placeholder guess,
flagged with a `TODO` comment in `site.js` — confirm before treating it as authoritative.

## Other directories

- `answers/` — the FAQ page (`answers/index.html`), same shared theme, no separate JS.
- `marketing/` — paste-ready content blocks (blog footer snippet, Google Business
  Profile copy, email signature HTML) used outside the app itself, not loaded by any page.
