/* Instant VIN lookup for the Compliance Hub.
   Decodes against NHTSA vPIC (free, CORS-open). Does NOT claim CTC-VIS
   compliance — that lives in CARB's registry, not the federal VIN file. */

(() => {
  const PHONE_DISPLAY = "415-900-8563";
  const PHONE_TEL = "4159008563";
  const EMAIL = "dispatch@mobilecarbtesting.com";
  const FINDER_URL = "https://carbcleantruckcheck.app/#find";

  const TICKER = [
    "Jan 1 deadline: annual reporting fee due for registered entities.",
    "Pro-tip: missing a PSIP / CTC window can lock the truck in CTC-VIS. Confirm dates there, not here.",
    "Find a tester uses our network only — not a Google Maps shop list.",
    "Smart sync: email engine-family tags to dispatch before anyone rolls.",
    "VIN lookup reads the federal NHTSA file — it is not your CARB pass/fail status."
  ];

  const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const VIN_TRANSLIT = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9
  };

  const cleanVin = (raw) =>
    String(raw || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .replace(/[OQ]/g, "0")
      .replace(/I/g, "1")
      .slice(0, 17);

  const checkDigitOk = (vin) => {
    if (vin.length !== 17) return false;
    let sum = 0;
    for (let i = 0; i < 17; i += 1) {
      const ch = vin[i];
      const value = /[0-9]/.test(ch) ? Number(ch) : VIN_TRANSLIT[ch] || 0;
      sum += value * VIN_WEIGHTS[i];
    }
    const digit = sum % 11;
    const expected = digit === 10 ? "X" : String(digit);
    return vin[8] === expected;
  };

  const fieldMap = (results) => {
    const out = {};
    (results || []).forEach((row) => {
      if (row && row.Value && row.Value !== "Not Applicable") {
        out[row.Variable] = row.Value;
      }
    });
    return out;
  };

  const errorCodeOf = (fields) =>
    String(fields["Error Code"] || fields.ErrorCode || "");

  const recommendTest = (yearNum, fuel) => {
    const fuelLc = String(fuel || "").toLowerCase();
    const diesel = fuelLc.includes("diesel");
    const altFuel =
      /cng|lng|lpg|propane|natural|gasoline|electric|hybrid|methanol|ethanol/.test(fuelLc);

    if (!yearNum) {
      return {
        kind: "unknown",
        label: "Confirm with dispatch",
        price: null,
        reason: "Model year did not come back cleanly. Have the engine tag ready and we will confirm HD-OBD vs OVI before anyone rolls."
      };
    }
    if (diesel && yearNum >= 2013) {
      return {
        kind: "hd-obd",
        label: "HD-OBD scan",
        price: 119,
        reason: "2013 or newer diesel usually needs a CARB-certified HD-OBD port scan."
      };
    }
    if (diesel && yearNum <= 2012) {
      return {
        kind: "ovi",
        label: "OVI smoke / opacity test",
        price: 219,
        reason: "2012 and older diesel usually needs the SAE J1667 smoke test plus a visual inspection."
      };
    }
    if (altFuel && yearNum >= 2018) {
      return {
        kind: "hd-obd",
        label: "HD-OBD scan (alt fuel)",
        price: 119,
        reason: "2018 or newer alternative-fuel vehicles often use HD-OBD. Dispatch still confirms fuel type before the visit."
      };
    }
    return {
      kind: "visual",
      label: "Visual inspection / confirm",
      price: null,
      reason: "Fuel type and year need a human confirm. This is not a CTC-VIS pass/fail — call dispatch with the VIN."
    };
  };

  const decodeVin = async (vin) => {
    const url =
      "https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/" +
      encodeURIComponent(vin) +
      "?format=json";
    const response = await fetch(url);
    if (!response.ok) throw new Error("NHTSA HTTP " + response.status);
    const payload = await response.json();
    const fields = fieldMap(payload.Results);
    const errorCode = errorCodeOf(fields);
    const year = fields["Model Year"] || "";
    const yearNum = parseInt(year, 10);
    const fuel = fields["Fuel Type - Primary"] || "";
    const hasIdentity = Boolean(fields.Make || fields.Model || year);
    /* NHTSA uses "Error Code" (with a space). Code 0 is a clean decode.
       Code 1 is a check-digit mismatch — make/model often still usable. */
    const clean = errorCode === "0" || errorCode.startsWith("0 -") || errorCode === "0";
    return {
      vin,
      clean,
      usable: clean || hasIdentity,
      errorCode,
      errorText: fields["Error Text"] || "",
      year,
      yearNum: Number.isFinite(yearNum) ? yearNum : null,
      make: fields.Make || "",
      model: fields.Model || "",
      fuel,
      engineMfr: fields["Engine Manufacturer"] || "",
      engineModel: fields["Engine Model"] || "",
      displacement: fields["Displacement (L)"] || "",
      gvwr:
        fields["Gross Vehicle Weight Rating From"] ||
        fields["Gross Vehicle Weight Rating"] ||
        fields.GVWR ||
        "",
      vehicleType: fields["Vehicle Type"] || "",
      bodyClass: fields["Body Class"] || "",
      test: recommendTest(Number.isFinite(yearNum) ? yearNum : null, fuel)
    };
  };

  const hostName = () => location.hostname.replace(/^www\./, "").toLowerCase();
  const isVinHost = () => hostName() === "cleantruckcheckvin.app";

  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const escapeHtml = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const setView = (name) => {
    qsa("[data-view]").forEach((el) => {
      el.hidden = el.getAttribute("data-view") !== name;
    });
    const title = {
      home: "Mobile CARB Compliance Hub",
      vin: "Instant VIN lookup",
      finder: "Find a credentialed tester",
      intake: "Document intake",
      info: "Clean Truck Check 101"
    }[name] || "Mobile CARB Compliance Hub";
    document.title = title + " | CARB Clean Truck Check";
    if (name !== "home") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const testCopy = (test) => {
    switch (test.kind) {
      case "hd-obd":
        return test;
      case "ovi":
        return test;
      case "visual":
        return test;
      case "unknown":
        return test;
      default: {
        const _never = test.kind;
        throw new Error("Unhandled test kind: " + _never);
      }
    }
  };

  const renderResult = (decoded, box) => {
    const test = testCopy(decoded.test);
    const yearMakeModel = [decoded.year, decoded.make, decoded.model]
      .filter(Boolean)
      .join(" ");
    const price = test.price ? "$" + test.price : "Call for price";
    const engineBits = [decoded.engineMfr, decoded.engineModel, decoded.displacement ? decoded.displacement + "L" : ""]
      .filter(Boolean)
      .join(" · ");
    const typeLine = [decoded.vehicleType, decoded.bodyClass].filter(Boolean).join(" · ");

    box.innerHTML =
      '<div class="kv">' +
      "<dt>Vehicle</dt><dd>" + escapeHtml(yearMakeModel || "See details below") + "</dd>" +
      "<dt>VIN</dt><dd class=\"vin-monospace\">" + escapeHtml(decoded.vin) + "</dd>" +
      "<dt>Fuel</dt><dd>" + escapeHtml(decoded.fuel || "Not reported") + "</dd>" +
      "<dt>GVWR</dt><dd>" + escapeHtml(decoded.gvwr || "Not reported") + "</dd>" +
      "<dt>Type</dt><dd>" + escapeHtml(typeLine || "Not reported") + "</dd>" +
      (engineBits ? "<dt>Engine</dt><dd>" + escapeHtml(engineBits) + "</dd>" : "") +
      "</div>" +
      '<div class="test-card ' + escapeHtml(test.kind) + '">' +
      "<strong>" + escapeHtml(test.label) + (test.price ? ' · <span class="price">' + escapeHtml(price) + "</span>" : "") + "</strong>" +
      "<p class=\"note\">" + escapeHtml(test.reason) + "</p>" +
      "</div>" +
      '<p class="note">This is federal VIN identity from NHTSA, not your CARB CTC-VIS compliance record. Confirm the due date in CTC-VIS before you book.</p>' +
      '<div class="cta-row">' +
      '<a class="hub-btn accent" href="#find-tester">Find a tester for this truck</a>' +
      '<a class="hub-btn" href="tel:' + PHONE_TEL + '">Call ' + PHONE_DISPLAY + "</a>" +
      '<a class="hub-btn" href="mailto:' + EMAIL + "?subject=" + encodeURIComponent("VIN " + decoded.vin) +
      "&body=" + encodeURIComponent(
        "VIN: " + decoded.vin + "\n" +
        yearMakeModel + "\n" +
        "Fuel: " + (decoded.fuel || "") + "\n" +
        "Suggested test: " + test.label + "\n"
      ) + '">Email dispatch this VIN</a>' +
      "</div>";
    box.hidden = false;

    const intakeVin = qs("[data-intake-vin]");
    if (intakeVin) intakeVin.value = decoded.vin;
    const afterNote = qs("[data-after-vin-note]");
    if (afterNote) {
      afterNote.textContent =
        (yearMakeModel || "This VIN") +
        " — pick a ZIP or location next. Suggested test: " +
        test.label +
        (test.price ? " ($" + test.price + ")" : "") +
        ". This is not a CTC-VIS pass/fail.";
    }
    const afterFinder = qs("[data-finder-after-vin]");
    if (afterFinder) afterFinder.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const bootTicker = () => {
    const el = qs("[data-ticker]");
    if (!el) return;
    let i = 0;
    el.textContent = TICKER[0];
    window.setInterval(() => {
      i = (i + 1) % TICKER.length;
      el.textContent = TICKER[i];
    }, 4200);
  };

  const bindNav = () => {
    document.body.addEventListener("click", (event) => {
      const go = event.target.closest("[data-go]");
      if (!go) return;
      event.preventDefault();
      setView(go.getAttribute("data-go"));
    });
  };

  const bindVinForm = () => {
    const input = qs("[data-vin-input]");
    const status = qs("[data-vin-status]");
    const result = qs("[data-vin-result]");
    const submit = qs("[data-vin-submit]");
    if (!input || !status || !result || !submit) return;

    let lastVin = "";

    const setStatus = (text, kind) => {
      status.textContent = text || "";
      status.className = "vin-status" + (kind ? " " + kind : "");
    };

    const runDecode = async (vin) => {
      lastVin = vin;
      submit.disabled = true;
      setStatus("Looking up the federal VIN file…");
      result.hidden = true;
      try {
        const decoded = await decodeVin(vin);
        if (lastVin !== vin) return;
        if (!decoded.usable) {
          setStatus("VIN NOT FOUND: federal database lookup failed. Check the characters and try again.", "err");
          return;
        }
        if (!decoded.clean) {
          setStatus("Decoded with a warning — check digit may not match. Confirm the VIN on the truck.", "err");
        } else {
          setStatus("Match from NHTSA vPIC — year/make/model only, not CTC-VIS status.", "ok");
        }
        renderResult(decoded, result);
      } catch (err) {
        setStatus("Network error — could not reach the NHTSA VIN database.", "err");
      } finally {
        submit.disabled = false;
      }
    };

    input.addEventListener("input", () => {
      const vin = cleanVin(input.value);
      if (vin !== input.value) input.value = vin;
      result.hidden = true;
      if (!vin) {
        setStatus("");
        return;
      }
      if (/[IOQ]/.test(input.value)) {
        setStatus("VINs never contain I, O, or Q — those were corrected.", "err");
      } else if (vin.length < 17) {
        setStatus("Awaiting " + (17 - vin.length) + " more characters…");
      } else if (!checkDigitOk(vin)) {
        setStatus("Check digit looks off. We'll still query NHTSA — confirm the plate on the door jamb.");
      } else {
        setStatus("17 characters — ready to decode.");
      }
    });

    submit.addEventListener("click", () => {
      const vin = cleanVin(input.value);
      if (vin.length !== 17) {
        setStatus("Enter all 17 VIN characters.", "err");
        return;
      }
      runDecode(vin);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit.click();
      }
    });

    const focusBtn = qs("[data-vin-focus]");
    if (focusBtn) {
      focusBtn.addEventListener("click", () => {
        input.focus();
        setStatus("Type the 17 characters from the door-jamb label. Camera OCR is not enabled on this page.");
      });
    }

    const upload = qs("[data-vin-upload]");
    if (upload) {
      upload.addEventListener("change", () => {
        const file = upload.files && upload.files[0];
        upload.value = "";
        if (!file) return;
        const nameVin = cleanVin(file.name);
        if (nameVin.length === 17) {
          input.value = nameVin;
          setStatus("Read 17 characters from the file name — confirm they match the truck, then decode.");
          return;
        }
        input.focus();
        setStatus("Photo OCR is not on this page. Type the VIN from the image, then tap Check registry status.", "err");
      });
    }
  };

  const bindIntake = () => {
    const form = qs("[data-intake-form]");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const company = String(data.get("company") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const vin = cleanVin(data.get("vin"));
      const body =
        "Document intake\n" +
        "Company: " + company + "\n" +
        "Phone: " + phone + "\n" +
        "VIN: " + vin + "\n\n" +
        "Attach cab card, engine tag, and plate photos.";
      location.href =
        "mailto:" + EMAIL +
        "?subject=" + encodeURIComponent("Clean Truck Check document intake" + (vin ? " " + vin : "")) +
        "&body=" + encodeURIComponent(body);
    });
  };

  window.CARB_VIN = { decodeVin, cleanVin, checkDigitOk, recommendTest };

  const startView = () => {
    /* VIN domain: splash hub first. Finder site /vin/: skip splash, go to lookup. */
    if (isVinHost()) {
      setView("home");
      return;
    }
    setView("vin");
    qsa(".back").forEach((el) => {
      el.removeAttribute("data-go");
      el.textContent = "← Find a tester";
      el.addEventListener("click", (event) => {
        event.preventDefault();
        location.href = "/";
      });
    });
  };

  bootTicker();
  bindNav();
  bindVinForm();
  bindIntake();
  startView();

  /* Finder site still uses the in-network matcher from site.js. */
  const finderNote = qs("[data-finder-note]");
  if (finderNote && !finderNote.textContent.trim()) {
    finderNote.textContent =
      "Results are our own testers only — never an outside shop.";
  }

  /* Keep a text path to the statewide finder if someone lands here from ads. */
  const offsite = qs("[data-finder-offsite]");
  if (offsite && isVinHost()) {
    offsite.hidden = false;
    offsite.href = FINDER_URL;
  }
})();
