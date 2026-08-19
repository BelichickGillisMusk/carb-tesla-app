#!/usr/bin/env python3
"""Confirm NHTSA VIN decode uses the field names vin.js expects,
   plus ZIP → network routing for the hub finder."""

from __future__ import annotations

import json
import math
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


def miles_between(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rad = math.radians
    d_lat = rad(lat2 - lat1)
    d_lon = rad(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.sin(d_lon / 2) ** 2
    return 3958.8 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


SITES = [
    {"name": "Hayward", "lat": 37.6688, "lon": -122.0808, "radius": 50, "coverage": "radius"},
    {"name": "Lodi", "lat": 38.1302, "lon": -121.2722, "radius": 50, "coverage": "radius"},
    {"name": "San Diego", "lat": 32.7157, "lon": -117.1611, "radius": 45, "coverage": "county"},
    {"name": "Mobile OVI Test", "lat": None, "lon": None, "radius": None, "coverage": "statewide"},
]


def find_sites(lat: float, lon: float) -> list[str]:
    located = []
    for site in SITES:
        if site["lat"] is None:
            continue
        distance = miles_between(lat, lon, site["lat"], site["lon"])
        if distance <= site["radius"]:
            located.append(site["name"])
    return located


def lookup_zip(zip_code: str) -> tuple[float, float, str]:
    url = f"https://api.zippopotam.us/us/{zip_code}"
    with urllib.request.urlopen(url, timeout=20) as response:
        payload = json.load(response)
    place = payload["places"][0]
    return float(place["latitude"]), float(place["longitude"]), place["place name"]


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

    assert recommend_test(2019, "Diesel") == "hd-obd"
    assert recommend_test(2011, "Diesel") == "ovi"

    hayward_lat, hayward_lon, hayward_name = lookup_zip("94544")
    assert "Hayward" in find_sites(hayward_lat, hayward_lon), (hayward_name, find_sites(hayward_lat, hayward_lon))

    lodi_lat, lodi_lon, lodi_name = lookup_zip("95240")
    assert "Lodi" in find_sites(lodi_lat, lodi_lon), (lodi_name, find_sites(lodi_lat, lodi_lon))

    sd_lat, sd_lon, sd_name = lookup_zip("92101")
    assert find_sites(sd_lat, sd_lon) == ["San Diego"], (sd_name, find_sites(sd_lat, sd_lon))

    fresno_lat, fresno_lon, fresno_name = lookup_zip("93701")
    assert find_sites(fresno_lat, fresno_lon) == [], (fresno_name, find_sites(fresno_lat, fresno_lon))

    print("ok", VIN, fields["Make"], fields["Model"], fields["Model Year"], kind)
    print("error-field", repr(list(k for k in fields if "rror" in k)))
    print("zips", hayward_name, lodi_name, sd_name, fresno_name)


if __name__ == "__main__":
    main()
