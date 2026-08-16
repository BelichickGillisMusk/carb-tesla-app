#!/usr/bin/env python3
"""Confirm NHTSA VIN decode uses the field names vin.js expects."""

from __future__ import annotations

import json
import urllib.request

VIN = "1HGCM82633A004352"


def recommend_test(year: int | None, fuel: str) -> str:
    fuel_lc = (fuel or "").lower()
    diesel = "diesel" in fuel_lc
    alt = any(
        token in fuel_lc
        for token in ("cng", "lng", "lpg", "propane", "natural", "gasoline", "electric", "hybrid")
    )
    if not year:
        return "unknown"
    if diesel and year >= 2013:
        return "hd-obd"
    if diesel and year <= 2012:
        return "ovi"
    if alt and year >= 2018:
        return "hd-obd"
    return "visual"


def main() -> None:
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{VIN}?format=json"
    with urllib.request.urlopen(url, timeout=20) as response:
        payload = json.load(response)
    fields = {
        row["Variable"]: row["Value"]
        for row in payload["Results"]
        if row.get("Value") and row["Value"] != "Not Applicable"
    }

    # The live AI Studio bundle keyed ErrorCode (no space) and always failed.
    assert "Error Code" in fields, fields.keys()
    assert "ErrorCode" not in fields
    assert fields["Error Code"] == "0", fields["Error Code"]
    assert fields["Make"] == "HONDA"
    assert fields["Model"] == "Accord"
    assert fields["Model Year"] == "2003"
    assert fields["Fuel Type - Primary"] == "Gasoline"

    year = int(fields["Model Year"])
    kind = recommend_test(year, fields["Fuel Type - Primary"])
    assert kind == "visual", kind

    diesel_fields = {
        "Model Year": "2019",
        "Fuel Type - Primary": "Diesel",
    }
    assert recommend_test(2019, "Diesel") == "hd-obd"
    assert recommend_test(2011, "Diesel") == "ovi"
    print("ok", VIN, fields["Make"], fields["Model"], fields["Model Year"], kind)
    print("error-field", repr(list(k for k in fields if "rror" in k)))
    del diesel_fields


if __name__ == "__main__":
    main()
