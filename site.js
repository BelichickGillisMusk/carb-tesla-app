/* Shared behavior for every page: satellite-site links with optional
   geolocation highlighting, and the dispatch assistant (agent) widget.
   Self-contained — no external scripts, so it works even when third-party
   embeds are blocked. */

(() => {
  const PHONE_DISPLAY = "415-900-8563";
  const PHONE_TEL = "4159008563";
  const EMAIL = "dispatch@mobilecarbtesting.com";

  const SATELLITES = [
    {
      name: "Clean Truck Check Roseville",
      url: "https://cleantruckcheckroseville.com",
      blurb: "Roseville, Rocklin, and Placer County corridor testing.",
      lat: 38.7521, lon: -121.288
    },
    {
      name: "Clean Truck Check Fairfield",
      url: "https://cleantruckcheckfairfield.com",
      blurb: "Fairfield, Vacaville, and the I-80 Solano corridor.",
      lat: 38.2494, lon: -122.04
    },
    {
      name: "Clean Truck Check Hayward",
      url: "https://cleantruckcheckhayward.com",
      blurb: "Hayward, Oakland, and East Bay yard visits.",
      lat: 37.6688, lon: -122.0808
    },
    {
      name: "NorCal CARB Mobile",
      url: "https://norcalcarbmobile.com",
      blurb: "Northern California hub for mobile Clean Truck Check service.",
      lat: 38.5816, lon: -121.4944
    },
    {
      name: "Mobile OVI Test",
      url: "https://mobileovitest.com",
      blurb: "Statewide OVI smoke and opacity testing for older diesels.",
      lat: null, lon: null
    }
  ];

  const NEARBY_MILES = 60;

  const milesBetween = (lat1, lon1, lat2, lon2) => {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /* ---------- Satellite site cards ---------- */

  const satGrid = document.querySelector("[data-satellite-grid]");
  const geoNote = document.querySelector("[data-geo-note]");

  const renderSatellites = (position) => {
    if (!satGrid) return;
    let sites = SATELLITES.map((s) => ({ ...s, distance: null }));
    if (position) {
      const { latitude, longitude } = position.coords;
      sites.forEach((s) => {
        if (s.lat !== null) {
          s.distance = milesBetween(latitude, longitude, s.lat, s.lon);
        }
      });
      sites.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    satGrid.innerHTML = "";
    sites.forEach((s) => {
      const card = document.createElement("a");
      card.className = "satellite-card";
      card.href = s.url;
      card.rel = "noopener";
      if (s.distance !== null && s.distance <= NEARBY_MILES) {
        card.classList.add("nearby");
      }
      const distance =
        s.distance !== null
          ? '<span class="distance">~' + Math.round(s.distance) + " miles from you</span>"
          : "";
      card.innerHTML =
        "<h3>" + s.name + "</h3><p>" + s.blurb + "</p>" + distance;
      satGrid.appendChild(card);
    });
  };

  const requestGeo = (onDone) => {
    if (!("geolocation" in navigator)) {
      if (geoNote) geoNote.textContent = "Location is not available in this browser — all sites are listed below.";
      if (onDone) onDone(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        renderSatellites(pos);
        if (geoNote) geoNote.textContent = "Sites are sorted by distance from your location. The closest service areas are highlighted.";
        if (onDone) onDone(pos);
      },
      () => {
        if (geoNote) geoNote.textContent = "Location was not shared — all sites are listed below in default order.";
        if (onDone) onDone(null);
      },
      { maximumAge: 600000, timeout: 8000 }
    );
  };

  renderSatellites(null);
  const geoButton = document.querySelector("[data-geo-button]");
  if (geoButton) geoButton.addEventListener("click", () => requestGeo());

  /* ---------- Dispatch assistant (agent) widget ---------- */

  const satelliteLinksHtml = () =>
    SATELLITES.map((s) => '<a href="' + s.url + '" rel="noopener">' + s.name + "</a>").join(" · ");

  const nearestSatelliteReply = (pos) => {
    if (!pos) {
      return "I couldn't read your location, but here are all of our sites: " + satelliteLinksHtml();
    }
    const { latitude, longitude } = pos.coords;
    const withDist = SATELLITES.filter((s) => s.lat !== null)
      .map((s) => ({ ...s, distance: milesBetween(latitude, longitude, s.lat, s.lon) }))
      .sort((a, b) => a.distance - b.distance);
    const nearest = withDist[0];
    if (nearest.distance <= NEARBY_MILES) {
      return (
        "You're about " + Math.round(nearest.distance) + ' miles from our <a href="' +
        nearest.url + '" rel="noopener">' + nearest.name + "</a> service area — that site has local scheduling. All sites: " +
        satelliteLinksHtml()
      );
    }
    return (
      "No satellite service area is within " + NEARBY_MILES + " miles, so this San Diego page is your best contact: call " +
      '<a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + "</a>. Other sites: " + satelliteLinksHtml()
    );
  };

  const RESPONSES = [
    {
      match: /(price|pricing|cost|how much|\$|fee|rate)/i,
      reply:
        "Current market pricing: <strong>$119</strong> for an HD-OBD test (2013+ diesel) and <strong>$219</strong> for an OVI smoke/opacity test (2012 and older diesel). Multi-truck yards may qualify for bundled scheduling — call <a href=\"tel:" +
        PHONE_TEL + '">' + PHONE_DISPLAY + "</a> for fleet routes."
    },
    {
      match: /(which test|what test|obd|ovi|opacity|smoke|older|newer|year|need)/i,
      reply:
        "Quick rule of thumb: <strong>2013 or newer diesel</strong> (or 2018+ alternative fuel) usually needs the HD-OBD scan ($119). <strong>2012 or older diesel</strong> usually needs the OVI smoke/opacity test plus visual inspection ($219). Not sure? Have your VIN ready and dispatch will confirm — or use the test finder on the homepage."
    },
    {
      match: /(book|schedule|appointment|request|come out|visit|when can)/i,
      reply:
        'Fastest ways to book: call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY +
        '</a>, email <a href="mailto:' + EMAIL + '">' + EMAIL +
        '</a>, or send the <a href="/#intake">intake form</a> with your VIN, plate, yard address, and deadline. We come to your yard or job site.'
    },
    {
      match: /(near|nearby|close|area|location|where|city|serve|roseville|fairfield|hayward|sacramento|bay area|norcal)/i,
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
        "Hi! I can help with pricing, which test your truck needs, scheduling, and finding the closest service site. Try one of the quick buttons below, or type a question."
    }
  ];

  const FALLBACK =
    'I want to make sure you get an exact answer — call dispatch at <a href="tel:' + PHONE_TEL + '">' +
    PHONE_DISPLAY + '</a> or email <a href="mailto:' + EMAIL + '">' + EMAIL +
    '</a>. You can also check the <a href="/answers/">Answers page</a> for common questions.';

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
      '<div class="agent-head"><div><strong>Dispatch assistant</strong><span class="muted">Pricing, test type, scheduling, nearest site</span></div><button class="agent-close" type="button" aria-label="Close assistant">&times;</button></div>' +
      '<div class="agent-messages" role="log" aria-live="polite"></div>' +
      '<div class="agent-chips">' +
      '<button class="agent-chip" type="button" data-q="What does testing cost?">Pricing</button>' +
      '<button class="agent-chip" type="button" data-q="Which test does my truck need?">Which test?</button>' +
      '<button class="agent-chip" type="button" data-q="How do I book an appointment?">Book a test</button>' +
      '<button class="agent-chip" type="button" data-q="Which site is near me?">Sites near me</button>' +
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
        addMsg("Checking which service site is closest to you…", "bot");
        requestGeo((pos) => addMsg(nearestSatelliteReply(pos), "bot"));
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
          "Welcome! I can answer questions about mobile CARB testing — pricing, which test your truck needs, booking, and the closest service site.",
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
