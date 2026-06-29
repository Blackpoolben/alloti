# 🌿 Alloti — UK Gardening Companion

A full-stack mobile app for UK allotment and garden growers. Identify plants with your camera, get hyperlocal weather, and track your garden through the seasons.

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | Expo (React Native) |
| Backend  | Flask (Python 3.12) |
| Database | SQLite (dev) |
| Plant ID | PlantNet API + TFLite offline fallback |
| Weather  | Open-Meteo (free, no key) |
| Postcodes| postcodes.io (free, no key) |

---

## Project structure

```
alloti/
├── backend/
│   ├── app.py              Flask API (weather, plant ID proxy, garden tracker)
│   ├── gardening_app.py    50+ UK plant database with seasonal schedules
│   ├── train.py            MobileNetV2 → TFLite trainer
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── App.js              Bottom-tab navigation
    ├── app.json            Expo config (permissions, splash, icons)
    ├── package.json
    ├── api/
    │   └── gardeningApi.js API client for all backend endpoints
    ├── screens/
    │   ├── HomeScreen.js       Weather dashboard + seasonal guidance
    │   ├── CameraScreen.js     Camera + PlantNet identification
    │   ├── PlantDetailScreen.js Planting/pruning calendar + companions
    │   ├── GardenScreen.js     My garden tracker
    │   ├── HistoryScreen.js    Identification history
    │   └── SettingsScreen.js   Postcode, API URL, offline mode
    └── services/
        └── OfflineIdentifier.js TFLite inference (react-native-fast-tflite)
```

---

## Backend setup

```bash
cd backend
pip install -r requirements.txt
python app.py          # dev server on :5000
```

### Docker

```bash
docker build -t alloti-backend .
docker run -p 5000:5000 -v alloti-data:/data alloti-backend
```

### Environment variables

| Variable          | Default                        | Description |
|-------------------|--------------------------------|-------------|
| `PLANTNET_API_KEY`| `2b10f9eTDgVF6DKZVwr2m73ZMe`  | PlantNet API key |
| `PORT`            | `5000`                         | Bind port |
| `DB_PATH`         | `/tmp/alloti.db`               | SQLite database path |
| `FLASK_DEBUG`     | `0`                            | Enable debug mode |

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/` | Health check |
| GET    | `/weather/<postcode>` | 7-day forecast + frost dates |
| POST   | `/identify` | Identify plant from image (multipart) |
| GET    | `/plants` | List all plants (`?category=`, `?q=`) |
| GET    | `/plants/<id>` | Plant detail |
| GET    | `/plants/<id>/companions` | Companion planting info |
| GET    | `/seasonal` | Monthly tasks, sow/prune/harvest lists |
| GET    | `/garden` | My garden list |
| POST   | `/garden` | Add plant to garden |
| PATCH  | `/garden/<id>` | Update garden entry |
| DELETE | `/garden/<id>` | Remove from garden |
| GET    | `/history` | Identification history |
| DELETE | `/history/<id>` | Delete history entry |
| GET    | `/settings` | App settings |
| POST   | `/settings` | Save settings |

---

## Frontend setup

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

### Update backend URL

Edit `frontend/api/gardeningApi.js` or change the API URL in the Settings screen.

---

## Training the offline model

```bash
cd backend
# Organise training images:
# plant_images/
#   tomato/  rose/  lavender/  ...

pip install tensorflow numpy
python train.py --data_dir ./plant_images --epochs 20 --output alloti_plants.tflite

# Copy outputs to frontend
cp alloti_plants.tflite ../frontend/assets/
cp labels.json ../frontend/assets/
```

---

## UK plant database

`gardening_app.py` contains **50+ species** across vegetables, fruits, herbs, flowers, shrubs, climbers, perennials and bulbs, each with:

- Monthly sow / transplant / harvest / prune calendars
- Pruning notes specific to UK seasons
- Frost hardiness
- Companion planting (good neighbours & plants to avoid)
- Common pests & diseases
- Watering, sunlight and soil requirements
- Growing tips

Frost-free dates are regionalised across 9 UK regions (Scotland Highlands to South West) using postcode prefix lookup.

---

## APIs used

- **[PlantNet](https://my.plantnet.org/)** — plant identification from photos
- **[Open-Meteo](https://open-meteo.com/)** — free weather API, no key required
- **[postcodes.io](https://postcodes.io/)** — UK postcode geocoding, no key required

---

## Licence

MIT
