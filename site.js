/* CARB Clean Truck Check app — shared behavior for every page.
   Contains: the network site directory, the Find a Tester feature, and the
   dispatch assistant (agent) widget. Self-contained, no external scripts.

   ============================================================
   SITE DIRECTORY — the ONLY results Find a Tester ever shows.
   To add one of the network sites, copy a block and set:
     name, url, blurb, lat/lon (city center), radiusMiles
   Special coverage types:
     coverage: "county"    → in-area only inside radius, no spillover
     coverage: "statewide" → always offered as the fallback
   ============================================================ */

(() => {
  const PHONE_DISPLAY = "415-900-8563";
  const PHONE_TEL = "4159008563";
  const EMAIL = "dispatch@mobilecarbtesting.com";

  const SITES = [
    {
      name: "Clean Truck Check Roseville",
      url: "https://cleantruckcheckroseville.com",
      blurb: "Roseville, Rocklin, Sacramento north, and the Placer County corridor.",
      lat: 38.7521, lon: -121.288, radiusMiles: 50, coverage: "radius"
    },
    {
      name: "Clean Truck Check Fairfield",
      url: "https://cleantruckcheckfairfield.com",
      blurb: "Fairfield, Vacaville, and the I-80 Solano corridor.",
      lat: 38.2494, lon: -122.04, radiusMiles: 50, coverage: "radius"
    },
    {
      name: "Clean Truck Check Hayward",
      url: "https://cleantruckcheckhayward.com",
      blurb: "Hayward, Oakland, and East Bay yard visits.",
      lat: 37.6688, lon: -122.0808, radiusMiles: 50, coverage: "radius"
    },
    {
      /* TODO: confirm the Stockton site URL before deploying. */
      name: "Clean Truck Check Stockton",
      url: "https://cleantruckcheckstockton.com",
      blurb: "Stockton, Lodi, Manteca, and the Highway 99 corridor.",
      lat: 37.9577, lon: -121.2908, radiusMiles: 50, coverage: "radius"
    },
    {
      name: "NorCal CARB Mobile",
      url: "https://norcalcarbmobile.com",
      blurb: "Northern California hub for mobile Clean Truck Check service.",
      lat: 38.5816, lon: -121.4944, radiusMiles: 50, coverage: "radius"
    },
    {
      name: "Mobile CARB Testing — San Diego",
      url: "https://mobilecarbsmoketest.com",
      blurb: "San Diego County only — OVI smoke and HD-OBD testing at your yard.",
      lat: 32.7157, lon: -117.1611, radiusMiles: 45, coverage: "county"
    },
    {
      name: "Mobile OVI Test",
      url: "https://mobileovitest.com",
      blurb: "Statewide OVI smoke and opacity testing for older diesels.",
      lat: null, lon: null, radiusMiles: null, coverage: "statewide"
    }
  ];

  /* Cities offered in the "pick your area" dropdown for people who don't
     share their location. Coordinates are city centers. */
  const CITIES = [
    ["Roseville / Rocklin", 38.7521, -121.288],
    ["Sacramento", 38.5816, -121.4944],
    ["Stockton / Lodi", 37.9577, -121.2908],
    ["Fairfield / Vacaville", 38.2494, -122.04],
    ["Hayward / Oakland / East Bay", 37.6688, -122.0808],
    ["San Francisco / Peninsula", 37.7749, -122.4194],
    ["San Jose", 37.3382, -121.8863],
    ["Modesto", 37.6391, -120.9969],
    ["Fresno", 36.7378, -119.7871],
    ["San Diego County", 32.7157, -117.1611],
    ["Los Angeles", 34.0522, -118.2437]
  ];

  const milesBetween = (lat1, lon1, lat2, lon2) => {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /* Core matcher: given a lat/lon, rank ONLY network sites.
     Returns { matches: sites in range sorted by distance,
               fallback: statewide site(s) } */
  const findSites = (lat, lon) => {
    const located = SITES.filter((s) => s.lat !== null)
      .map((s) => ({ ...s, distance: milesBetween(lat, lon, s.lat, s.lon) }))
      .sort((a, b) => a.distance - b.distance);
    const matches = located.filter((s) => s.distance <= s.radiusMiles);
    const fallback = SITES.filter((s) => s.coverage === "statewide");
    return { matches, fallback, located };
  };

  /* ---------- Find a Tester UI ---------- */

  const finder = document.querySelector("[data-finder]");

  const siteCardHtml = (s, highlight) => {
    const distance =
      s.distance !== undefined
        ? '<span class="distance">~' + Math.round(s.distance) + " miles away</span>"
        : "";
    return (
      '<a class="satellite-card' + (highlight ? " nearby" : "") + '" href="' + s.url + '" rel="noopener">' +
      "<h3>" + s.name + "</h3><p>" + s.blurb + "</p>" + distance + "</a>"
    );
  };

  const renderFinderResults = (lat, lon, label) => {
    const out = finder.querySelector("[data-finder-results]");
    const note = finder.querySelector("[data-finder-note]");
    const { matches, fallback } = findSites(lat, lon);
    if (matches.length) {
      note.textContent =
        "Testers covering " + label + " — the closest team is listed first:";
      out.innerHTML =
        matches.map((s, i) => siteCardHtml(s, i === 0)).join("") +
        fallback.map((s) => siteCardHtml(s, false)).join("");
    } else {
      note.textContent =
        "No city team covers " + label + " yet, but statewide dispatch does — request a visit and we'll route the closest tester:";
      out.innerHTML =
        fallback.map((s) => siteCardHtml(s, true)).join("") +
        '<div class="satellite-card"><h3>Call dispatch</h3><p>We route testers across California.</p>' +
        '<a class="button primary" style="margin-top:0.6rem" href="tel:' + PHONE_TEL + '">Call ' + PHONE_DISPLAY + "</a></div>";
    }
    out.hidden = false;
  };

  if (finder) {
    const citySelect = finder.querySelector("[data-finder-city]");
    CITIES.forEach(([name], i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = name;
      citySelect.appendChild(opt);
    });

    citySelect.addEventListener("change", () => {
      const idx = Number(citySelect.value);
      if (Number.isNaN(idx) || !CITIES[idx]) return;
      const [name, lat, lon] = CITIES[idx];
      renderFinderResults(lat, lon, name);
    });

    const geoBtn = finder.querySelector("[data-finder-geo]");
    geoBtn.addEventListener("click", () => {
      const note = finder.querySelector("[data-finder-note]");
      if (!("geolocation" in navigator)) {
        note.textContent = "Location is not available in this browser — pick your area from the list instead.";
        return;
      }
      note.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(
        (pos) => renderFinderResults(pos.coords.latitude, pos.coords.longitude, "your location"),
        () => { note.textContent = "Location was not shared — pick your area from the list instead."; },
        { maximumAge: 600000, timeout: 8000 }
      );
    });
  }

  /* ---------- Full network grid (footer of homepage) ---------- */

  const satGrid = document.querySelector("[data-satellite-grid]");
  if (satGrid) {
    satGrid.innerHTML = SITES.map((s) => siteCardHtml(s, false)).join("");
  }

  /* ---------- Dispatch assistant (agent) widget ---------- */

  const siteLinksHtml = () =>
    SITES.map((s) => '<a href="' + s.url + '" rel="noopener">' + s.name + "</a>").join(" · ");

  const nearestSiteReply = (pos) => {
    if (!pos) {
      return "I couldn't read your location — use the Find a Tester tool above and pick your area, or browse all sites: " + siteLinksHtml();
    }
    const { latitude, longitude } = pos.coords;
    const { matches, fallback } = findSites(latitude, longitude);
    if (matches.length) {
      const top = matches[0];
      return (
        "You're about " + Math.round(top.distance) + ' miles from our <a href="' + top.url +
        '" rel="noopener">' + top.name + "</a> team — that site has local scheduling. All our sites: " + siteLinksHtml()
      );
    }
    const state = fallback[0];
    return (
      "No city team covers your area yet, but statewide dispatch does — try <a href=\"" + state.url +
      '" rel="noopener">' + state.name + '</a> or call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + "</a>."
    );
  };

  const RESPONSES = [
    {
      match: /(price|pricing|cost|how much|\$|fee|rate)/i,
      reply:
        "Network pricing: <strong>$119</strong> for an HD-OBD test (2013+ diesel) and <strong>$219</strong> for an OVI smoke/opacity test (2012 and older diesel). Multi-truck yards may qualify for bundled scheduling — call <a href=\"tel:" +
        PHONE_TEL + '">' + PHONE_DISPLAY + "</a> for fleet routes."
    },
    {
      match: /(which test|what test|obd|ovi|opacity|smoke|older|newer|year|need)/i,
      reply:
        "Quick rule of thumb: <strong>2013 or newer diesel</strong> (or 2018+ alternative fuel) usually needs the HD-OBD scan ($119). <strong>2012 or older diesel</strong> usually needs the OVI smoke/opacity test plus visual inspection ($219). Not sure? Have your VIN ready and dispatch will confirm."
    },
    {
      match: /(book|schedule|appointment|request|come out|visit|when can)/i,
      reply:
        'Use <strong>Find a Tester</strong> on the homepage to get your local team, or call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY +
        '</a> / email <a href="mailto:' + EMAIL + '">' + EMAIL + "</a>. We come to your yard or job site."
    },
    {
      match: /(near|nearby|close|area|location|where|city|serve|roseville|stockton|fairfield|hayward|sacramento|bay area|norcal|san diego)/i,
      reply: "__GEO__"
    },
    {
      match: /(deadline|due|ctc|vis|compliance|carb rule|requirement|90 day)/i,
      reply:
        'Passing tests can be submitted up to 90 days before your compliance deadline, and owners should always confirm due dates in CTC-VIS. Official guidance: <a href="https://ww2.arb.ca.gov/resources/fact-sheets/clean-truck-check-faq-0" rel="noopener">CARB Clean Truck Check FAQ</a>. See more on our <a href="/answers/">Answers page</a>.'
    },
    {
      match: /(hi|hello|hey|help)/i,
      reply:
        "Hi! I can help with pricing, which test your truck needs, scheduling, and finding your closest tester. Try one of the quick buttons below, or type a question."
    }
  ];

  const FALLBACK =
    'I want to make sure you get an exact answer — call dispatch at <a href="tel:' + PHONE_TEL + '">' +
    PHONE_DISPLAY + '</a> or email <a href="mailto:' + EMAIL + '">' + EMAIL +
    '</a>. You can also check the <a href="/answers/">Answers page</a> for common questions.';

  const requestGeo = (onDone) => {
    if (!("geolocation" in navigator)) { onDone(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => onDone(pos),
      () => onDone(null),
      { maximumAge: 600000, timeout: 8000 }
    );
  };

  const buildWidget = () => {
    const launcher = document.createElement("button");
    launcher.className = "agent-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "agent-panel");
    launcher.innerHTML = "&#128172; Ask dispatch";

    const panel = document.createElement("section");
    panel.className = "agent-panel";
    panel.id = "agent-panel";
    panel.setAttribute("aria-label", "Dispatch assistant");
    panel.innerHTML =
      '<div class="agent-head"><div><strong>Dispatch assistant</strong><span class="muted">Pricing, test type, scheduling, nearest tester</span></div><button class="agent-close" type="button" aria-label="Close assistant">&times;</button></div>' +
      '<div class="agent-messages" role="log" aria-live="polite"></div>' +
      '<div class="agent-chips">' +
      '<button class="agent-chip" type="button" data-q="What does testing cost?">Pricing</button>' +
      '<button class="agent-chip" type="button" data-q="Which test does my truck need?">Which test?</button>' +
      '<button class="agent-chip" type="button" data-q="How do I book an appointment?">Book a test</button>' +
      '<button class="agent-chip" type="button" data-q="Which tester is near me?">Tester near me</button>' +
      "</div>" +
      '<form class="agent-input"><input type="text" name="q" placeholder="Type a question…" aria-label="Ask the dispatch assistant" autocomplete="off"><button type="submit">Send</button></form>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const messages = panel.querySelector(".agent-messages");
    const form = panel.querySelector(".agent-input");
    const input = form.querySelector("input");

    const addMsg = (html, who) => {
      const el = document.createElement("div");
      el.className = "agent-msg " + who;
      el.innerHTML = html;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    };

    const answer = (text) => {
      const rule = RESPONSES.find((r) => r.match.test(text));
      if (rule && rule.reply === "__GEO__") {
        addMsg("Checking which of our testers is closest to you…", "bot");
        requestGeo((pos) => addMsg(nearestSiteReply(pos), "bot"));
        return;
      }
      addMsg(rule ? rule.reply : FALLBACK, "bot");
    };

    const ask = (text) => {
      const clean = text.trim();
      if (!clean) return;
      addMsg(clean.replace(/</g, "&lt;"), "user");
      window.setTimeout(() => answer(clean), 250);
    };

    let greeted = false;
    const openPanel = (open) => {
      panel.classList.toggle("open", open);
      launcher.setAttribute("aria-expanded", String(open));
      if (open && !greeted) {
        greeted = true;
        addMsg(
          "Welcome! I can answer questions about CARB Clean Truck Check testing — pricing, which test your truck needs, booking, and your closest tester.",
          "bot"
        );
      }
      if (open) input.focus();
    };

    launcher.addEventListener("click", () => openPanel(!panel.classList.contains("open")));
    panel.querySelector(".agent-close").addEventListener("click", () => openPanel(false));

    panel.querySelectorAll(".agent-chip").forEach((chip) =>
      chip.addEventListener("click", () => ask(chip.dataset.q))
    );

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      ask(input.value);
      input.value = "";
    });
  };

  buildWidget();
})();
