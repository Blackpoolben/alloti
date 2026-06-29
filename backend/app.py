"""
Alloti — UK Gardening App  |  Flask backend
"""

import os
import json
import sqlite3
import logging
import requests
from datetime import datetime, date
from functools import wraps

from flask import Flask, request, jsonify, g, render_template_string
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

from gardening_app import (
    PLANTS,
    get_frost_dates,
    get_current_tasks,
    get_plants_to_sow_now,
    get_plants_to_prune_now,
    get_plants_to_harvest_now,
    search_plants,
    get_plant,
    get_companion_info,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

PLANTNET_API_KEY = os.environ.get("PLANTNET_API_KEY", "2b10f9eTDgVF6DKZVwr2m73ZMe")
PLANTNET_BASE    = "https://my-api.plantnet.org/v2/identify/all"
OPEN_METEO_BASE  = "https://api.open-meteo.com/v1/forecast"
POSTCODES_BASE   = "https://api.postcodes.io"
DB_PATH          = os.environ.get("DB_PATH", "/tmp/alloti.db")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS identification_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at  TEXT    NOT NULL,
            image_url   TEXT,
            species     TEXT,
            common_name TEXT,
            confidence  REAL,
            latitude    REAL,
            longitude   REAL,
            raw_json    TEXT
        );

        CREATE TABLE IF NOT EXISTS garden (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id    TEXT    NOT NULL,
            common_name TEXT    NOT NULL,
            added_at    TEXT    NOT NULL,
            notes       TEXT,
            location    TEXT,
            quantity    INTEGER DEFAULT 1,
            planted_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    """)
    db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def row_to_dict(row):
    return dict(row) if row else None


def success(data, status=200):
    return jsonify({"ok": True, "data": data}), status


def error(msg, status=400):
    return jsonify({"ok": False, "error": msg}), status


# ---------------------------------------------------------------------------
# Routes — Landing page & Health
# ---------------------------------------------------------------------------

LANDING_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alloti — Your UK Garden Companion</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--brand:#2D6A4F;--accent:#52B788;--light:#F0F7F4;--dark:#1B4332;--text:#222;--muted:#666}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:var(--text)}
  header{background:var(--brand);padding:20px 24px;display:flex;align-items:center;gap:12px}
  header h1{color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px}
  header span{font-size:32px}
  .hero{background:var(--light);padding:64px 24px;text-align:center}
  .hero h2{font-size:clamp(28px,5vw,48px);font-weight:800;color:var(--dark);line-height:1.2;margin-bottom:16px}
  .hero p{font-size:18px;color:var(--muted);max-width:560px;margin:0 auto 32px}
  .badges{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .badge{background:var(--brand);color:#fff;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
  .badge.outline{background:#fff;color:var(--brand);border:2px solid var(--brand)}
  .features{padding:64px 24px;max-width:960px;margin:0 auto}
  .features h3{text-align:center;font-size:26px;font-weight:800;color:var(--dark);margin-bottom:40px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
  .card{background:var(--light);border-radius:16px;padding:28px;text-align:center}
  .card .icon{font-size:48px;margin-bottom:16px}
  .card h4{font-size:18px;font-weight:700;color:var(--dark);margin-bottom:8px}
  .card p{font-size:14px;color:var(--muted);line-height:1.6}
  .waitlist{background:var(--dark);padding:64px 24px;text-align:center}
  .waitlist h3{color:#fff;font-size:26px;font-weight:800;margin-bottom:12px}
  .waitlist p{color:#a8d5b5;font-size:16px;margin-bottom:28px}
  .waitlist form{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;max-width:480px;margin:0 auto}
  .waitlist input{flex:1;min-width:220px;padding:14px 18px;border-radius:10px;border:none;font-size:15px}
  .waitlist button{background:var(--accent);color:#fff;border:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer}
  footer{background:var(--brand);padding:24px;text-align:center;color:rgba(255,255,255,0.7);font-size:13px}
  footer a{color:#fff;text-decoration:none;font-weight:600}
</style>
</head>
<body>

<header>
  <span>🌿</span>
  <h1>Alloti</h1>
</header>

<section class="hero">
  <h2>Your UK Garden Companion</h2>
  <p>Identify plants, track your garden, and get seasonal advice tailored to the British climate.</p>
  <div class="badges">
    <a class="badge" href="#">🍎 Coming to App Store</a>
    <a class="badge outline" href="#">🤖 Coming to Google Play</a>
  </div>
</section>

<section class="features">
  <h3>Everything your garden needs</h3>
  <div class="grid">
    <div class="card">
      <div class="icon">📷</div>
      <h4>Identify Any Plant</h4>
      <p>Point your camera at any plant and get an instant identification, powered by PlantNet and our UK plant database.</p>
    </div>
    <div class="card">
      <div class="icon">🌱</div>
      <h4>Track Your Garden</h4>
      <p>Log everything you're growing, record planting dates, locations and notes — all in one place.</p>
    </div>
    <div class="card">
      <div class="icon">📅</div>
      <h4>Seasonal Advice</h4>
      <p>Know exactly what to sow, prune and harvest each month, with frost date alerts for your postcode.</p>
    </div>
    <div class="card">
      <div class="icon">🌦️</div>
      <h4>Local Weather</h4>
      <p>Get a 7-day forecast tailored to your postcode, so you never get caught out by a British summer.</p>
    </div>
    <div class="card">
      <div class="icon">🔍</div>
      <h4>Disease Checker</h4>
      <p>Spot problems early with our plant disease identification tool, built for UK gardens.</p>
    </div>
    <div class="card">
      <div class="icon">📖</div>
      <h4>Garden Journal</h4>
      <p>Keep a record of your gardening year — photos, notes, wins and lessons learned.</p>
    </div>
  </div>
</section>

<section class="waitlist">
  <h3>Be first to know when we launch</h3>
  <p>Sign up and we'll let you know the moment Alloti is available.</p>
  <form onsubmit="return false;">
    <input type="email" placeholder="your@email.com">
    <button type="submit">Notify me</button>
  </form>
</section>

<footer>
  &copy; 2026 Alloti &nbsp;|&nbsp; Built with 🌿 in the UK &nbsp;|&nbsp;
  <a href="/api/health">API</a>
</footer>

</body>
</html>"""


@app.get("/")
def landing():
    return render_template_string(LANDING_HTML)


@app.get("/api/health")
def health():
    return success({"status": "running", "version": "1.0.0", "app": "Alloti"})


# ---------------------------------------------------------------------------
# Routes — Weather  (Open-Meteo + postcodes.io)
# ---------------------------------------------------------------------------

@app.get("/weather/<postcode>")
@limiter.limit("30 per minute")
def get_weather(postcode):
    postcode = postcode.upper().replace(" ", "")
    try:
        # Resolve postcode to lat/lon
        r = requests.get(f"{POSTCODES_BASE}/postcodes/{postcode}", timeout=5)
        if not r.ok or r.json().get("status") != 200:
            # Try partial/outward postcode
            r2 = requests.get(f"{POSTCODES_BASE}/outcodes/{postcode}", timeout=5)
            if not r2.ok:
                return error(f"Postcode {postcode} not found", 404)
            pdata = r2.json().get("result", {})
        else:
            pdata = r.json().get("result", {})

        lat = pdata.get("latitude")
        lon = pdata.get("longitude")
        if lat is None or lon is None:
            return error("Could not resolve postcode coordinates", 422)

        # Fetch weather from Open-Meteo
        params = {
            "latitude":  lat,
            "longitude": lon,
            "current": [
                "temperature_2m", "relative_humidity_2m", "apparent_temperature",
                "precipitation", "weather_code", "wind_speed_10m",
            ],
            "daily": [
                "temperature_2m_max", "temperature_2m_min",
                "precipitation_sum", "weather_code", "sunrise", "sunset",
                "uv_index_max",
            ],
            "timezone": "Europe/London",
            "forecast_days": 7,
        }
        wr = requests.get(OPEN_METEO_BASE, params=params, timeout=8)
        wr.raise_for_status()
        weather = wr.json()

        frost_info = get_frost_dates(postcode)

        return success({
            "postcode": postcode,
            "location": {
                "lat": lat,
                "lon": lon,
                "admin_district": pdata.get("admin_district"),
                "region": pdata.get("region"),
            },
            "current": weather.get("current", {}),
            "daily":   weather.get("daily", {}),
            "frost":   frost_info,
        })

    except requests.Timeout:
        return error("Weather service timed out", 504)
    except requests.RequestException as exc:
        logger.error("Weather fetch error: %s", exc)
        return error("Failed to fetch weather", 502)


# ---------------------------------------------------------------------------
# Routes — Plant Identification  (PlantNet proxy)
# ---------------------------------------------------------------------------

@app.post("/identify")
@limiter.limit("10 per minute")
def identify_plant():
    if "image" not in request.files:
        return error("No image file provided")

    image_file = request.files["image"]
    lat  = request.form.get("lat")
    lon  = request.form.get("lon")

    try:
        files   = [("images", (image_file.filename, image_file.read(), image_file.mimetype))]
        params  = {"api-key": PLANTNET_API_KEY}
        if lat and lon:
            params["lat"] = lat
            params["lon"] = lon

        pn_resp = requests.post(PLANTNET_BASE, files=files, params=params, timeout=20)
        pn_resp.raise_for_status()
        pn_data = pn_resp.json()

        results = pn_data.get("results", [])[:5]
        top = results[0] if results else {}

        species_name = (
            top.get("species", {}).get("scientificNameWithoutAuthor", "Unknown")
        )
        common_names = top.get("species", {}).get("commonNames", [])
        common_name  = common_names[0] if common_names else species_name
        confidence   = round(top.get("score", 0) * 100, 1)

        # Persist to history
        db = get_db()
        db.execute(
            """INSERT INTO identification_history
               (created_at, species, common_name, confidence, latitude, longitude, raw_json)
               VALUES (?,?,?,?,?,?,?)""",
            (
                datetime.utcnow().isoformat(),
                species_name,
                common_name,
                confidence,
                float(lat) if lat else None,
                float(lon) if lon else None,
                json.dumps(pn_data),
            ),
        )
        db.commit()

        # Try to match to our plant database
        matched = search_plants(common_name) or search_plants(species_name)

        return success({
            "top_match": {
                "species":     species_name,
                "common_name": common_name,
                "confidence":  confidence,
                "family":      top.get("species", {}).get("family", {}).get("scientificNameWithoutAuthor"),
                "genus":       top.get("species", {}).get("genus", {}).get("scientificNameWithoutAuthor"),
            },
            "all_results": [
                {
                    "species":     r.get("species", {}).get("scientificNameWithoutAuthor"),
                    "common_name": (r.get("species", {}).get("commonNames") or [""])[0],
                    "confidence":  round(r.get("score", 0) * 100, 1),
                }
                for r in results
            ],
            "db_match": matched[0] if matched else None,
        })

    except requests.Timeout:
        return error("PlantNet API timed out", 504)
    except requests.RequestException as exc:
        logger.error("PlantNet error: %s", exc)
        return error("Plant identification failed", 502)


# ---------------------------------------------------------------------------
# Routes — Plant Database
# ---------------------------------------------------------------------------

@app.get("/plants")
def list_plants():
    category = request.args.get("category")
    q        = request.args.get("q")

    plants = PLANTS
    if category:
        plants = [p for p in plants if p["category"] == category]
    if q:
        plants = search_plants(q)

    return success([
        {
            "id":          p["id"],
            "common_name": p["common_name"],
            "latin_name":  p["latin_name"],
            "category":    p["category"],
            "emoji":       p["emoji"],
            "difficulty":  p["difficulty"],
        }
        for p in plants
    ])


@app.get("/plants/<plant_id>")
def plant_detail(plant_id):
    plant = get_plant(plant_id)
    if not plant:
        return error(f"Plant '{plant_id}' not found", 404)
    return success(plant)


@app.get("/plants/<plant_id>/companions")
def plant_companions(plant_id):
    info = get_companion_info(plant_id)
    if not info:
        return error(f"Plant '{plant_id}' not found", 404)
    return success(info)


# ---------------------------------------------------------------------------
# Routes — Seasonal guidance
# ---------------------------------------------------------------------------

@app.get("/seasonal")
def seasonal_guidance():
    try:
        month = int(request.args.get("month", date.today().month))
        if not 1 <= month <= 12:
            raise ValueError
    except ValueError:
        return error("month must be 1–12")

    postcode = request.args.get("postcode", "SW1A")

    return success({
        "month":      month,
        "tasks":      get_current_tasks(month),
        "sow":        [
            {"id": i["plant"]["id"], "common_name": i["plant"]["common_name"],
             "action": i["action"], "emoji": i["plant"]["emoji"]}
            for i in get_plants_to_sow_now(month)
        ],
        "prune":      [
            {"id": p["id"], "common_name": p["common_name"],
             "notes": p["prune_notes"], "emoji": p["emoji"]}
            for p in get_plants_to_prune_now(month)
        ],
        "harvest":    [
            {"id": p["id"], "common_name": p["common_name"], "emoji": p["emoji"]}
            for p in get_plants_to_harvest_now(month)
        ],
        "frost_info": get_frost_dates(postcode),
    })


# ---------------------------------------------------------------------------
# Routes — Garden (my plants tracker)
# ---------------------------------------------------------------------------

@app.get("/garden")
def list_garden():
    db    = get_db()
    rows  = db.execute("SELECT * FROM garden ORDER BY added_at DESC").fetchall()
    return success([row_to_dict(r) for r in rows])


@app.post("/garden")
def add_to_garden():
    data = request.get_json(silent=True) or {}
    plant_id    = data.get("plant_id", "").strip()
    notes       = data.get("notes", "")
    location    = data.get("location", "")
    quantity    = int(data.get("quantity", 1))
    planted_at  = data.get("planted_at")

    if not plant_id:
        return error("plant_id required")

    plant = get_plant(plant_id)
    common_name = plant["common_name"] if plant else plant_id

    db = get_db()
    cur = db.execute(
        """INSERT INTO garden (plant_id, common_name, added_at, notes, location, quantity, planted_at)
           VALUES (?,?,?,?,?,?,?)""",
        (plant_id, common_name, datetime.utcnow().isoformat(),
         notes, location, quantity, planted_at),
    )
    db.commit()
    return success({"id": cur.lastrowid}, 201)


@app.delete("/garden/<int:entry_id>")
def remove_from_garden(entry_id):
    db = get_db()
    db.execute("DELETE FROM garden WHERE id = ?", (entry_id,))
    db.commit()
    return success({"deleted": entry_id})


@app.patch("/garden/<int:entry_id>")
def update_garden_entry(entry_id):
    data = request.get_json(silent=True) or {}
    allowed = {"notes", "location", "quantity", "planted_at"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return error("No valid fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db = get_db()
    db.execute(
        f"UPDATE garden SET {set_clause} WHERE id = ?",
        (*updates.values(), entry_id),
    )
    db.commit()
    return success({"updated": entry_id})


# ---------------------------------------------------------------------------
# Routes — Identification history
# ---------------------------------------------------------------------------

@app.get("/history")
def get_history():
    limit = min(int(request.args.get("limit", 50)), 200)
    db    = get_db()
    rows  = db.execute(
        "SELECT id, created_at, species, common_name, confidence FROM identification_history "
        "ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return success([row_to_dict(r) for r in rows])


@app.delete("/history/<int:entry_id>")
def delete_history(entry_id):
    db = get_db()
    db.execute("DELETE FROM identification_history WHERE id = ?", (entry_id,))
    db.commit()
    return success({"deleted": entry_id})


# ---------------------------------------------------------------------------
# Routes — Settings
# ---------------------------------------------------------------------------

@app.get("/settings")
def get_settings():
    db   = get_db()
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    return success({r["key"]: r["value"] for r in rows})


@app.post("/settings")
def save_settings():
    data = request.get_json(silent=True) or {}
    db   = get_db()
    for key, value in data.items():
        db.execute(
            "INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, str(value)),
        )
    db.commit()
    return success({"saved": list(data.keys())})


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
