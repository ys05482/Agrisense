# AgriSense Backend — Complete Setup Guide

## 📁 Project Structure
```
agrisense-backend/          ← This folder (Node.js backend)
├── server.js               ← Main Express server (port 3001)
├── ml_service.py           ← Python ML microservice (port 5001)
├── requirements.txt        ← Python dependencies
├── package.json            ← Node.js dependencies
├── .env                    ← API keys & config
├── routes/
│   ├── analyze.js          ← POST /api/analyze  (image + ML)
│   ├── simulate.js         ← POST /api/simulate (what-if)
│   ├── weather.js          ← GET  /api/weather
│   ├── prices.js           ← GET  /api/prices
│   ├── pest.js             ← GET  /api/pest
│   ├── translate.js        ← POST /api/translate
│   └── history.js          ← GET  /api/history
├── models/
│   └── index.js            ← MongoDB schemas
└── ml_models/              ← Your .pkl and .keras files go here
    ├── best_model.keras
    ├── xgboost_spoilage.pkl
    ├── scaler.pkl
    ├── label_encoder_crop.pkl
    ├── label_encoder_label.pkl
    └── label_encoder_storage.pkl
```

---

## 🚀 Step-by-Step Setup

### Step 1 — Install MongoDB
Make sure MongoDB is running locally:
```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Or use MongoDB Atlas (free cloud) — paste connection string in .env
```

### Step 2 — Setup Python ML Microservice
```bash
cd agrisense-backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

# Install Python dependencies
pip install -r requirements.txt

# Start ML microservice (keep this terminal open)
python ml_service.py
# Should print: 🚀 ML Service ready! Running on http://localhost:5001
```

### Step 3 — Setup Node.js Backend
Open a NEW terminal:
```bash
cd agrisense-backend

# Install Node.js dependencies
npm install

# Add form-data package (needed for multipart uploads)
npm install form-data

# Edit .env if needed (API keys)
# Start backend
npm run dev
# Should print: 🌱 AgriSense Backend running on http://localhost:3001
```

### Step 4 — Setup Frontend
Open another terminal in your React project:
```bash
cd your-frontend-folder   # wherever your Vite/React project is

# Copy the api service file
# Place frontend_api_service.js → src/services/api.js

# Create .env file in frontend root:
echo "VITE_API_URL=http://localhost:3001/api" > .env

# Install & run
npm install
npm run dev
# Runs on http://localhost:5174
```

---

## ✅ Test the Backend

```bash
# Health check
curl http://localhost:3001/api/health

# Weather by coordinates
curl "http://localhost:3001/api/weather?lat=28.6&lon=77.2"

# Simulate spoilage
curl -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"crop":"tomato","freshness":0.75,"temperature":30,"humidity":75,"storage_type":"room_temp"}'

# Pest risk
curl "http://localhost:3001/api/pest?crop=tomato&city=Delhi"

# Market prices
curl "http://localhost:3001/api/prices?crop=tomato&city=Delhi"
```

---

## 🔑 API Keys to Fill In

### OpenWeather (Free — Required for weather features)
1. Go to https://openweathermap.org/api
2. Create free account → API Keys tab → Copy key
3. Paste in `.env`: `OPENWEATHER_API_KEY=your_key_here`

### Google Translate (Optional — for Hindi/Marathi)
1. Go to https://console.cloud.google.com
2. Enable "Cloud Translation API"
3. Create credentials → API Key
4. Paste in `.env`: `GOOGLE_TRANSLATE_API_KEY=your_key_here`
> **Note:** Without this key, the app uses built-in static Hindi/Marathi translations for common UI strings.

---

## 📡 API Endpoints Reference

| Method | Endpoint            | Description                         |
|--------|---------------------|-------------------------------------|
| POST   | /api/analyze        | Upload crop image → ML prediction   |
| POST   | /api/simulate       | What-if spoilage simulation         |
| GET    | /api/weather        | Weather by ?lat=&lon= or ?city=     |
| GET    | /api/prices         | Market price + 14-day forecast      |
| GET    | /api/pest           | Pest risk by crop + weather         |
| POST   | /api/translate      | Translate texts to Hindi/Marathi    |
| GET    | /api/history        | Past analysis records from MongoDB  |
| DELETE | /api/history/:id    | Delete a record                     |
| GET    | /api/health         | Backend health status               |

---

## 🔌 Frontend Integration

Place `frontend_api_service.js` at `src/services/api.js` in your React project.

Then use it like:
```javascript
import api from './services/api';

// Get user location and weather
const location = await api.getUserLocation();
const weather  = await api.fetchWeather({ lat: location.lat, lon: location.lon });

// Analyze crop image
const result = await api.analyzeCrop({
  imageFile:   selectedFile,
  storageType: 'room_temp',
  lat:         location.lat,
  lon:         location.lon,
});

// Simulate
const sim = await api.simulate({
  crop: 'tomato', freshness: 0.75,
  temperature: 30, humidity: 75, storageType: 'room_temp'
});
```

---

## 🧠 How the ML Pipeline Works

```
User uploads image
      ↓
Node.js /api/analyze
      ↓
Python ML Service (port 5001)
      ↓
  CNN (best_model.keras)
  → Classifies: Fresh_Apple / Rotten_Banana / etc.
  → Extracts: crop_name, is_fresh, freshness_score (0-1)
      ↓
  XGBoost (xgboost_spoilage.pkl)
  → Input: 9 features (crop, storage, freshness, temp, humidity, ...)
  → Output: spoilage bucket (0-1 days / 1-2 days / 2-4 days / 4-7 days / 7+ days)
      ↓
Result saved to MongoDB
      ↓
Response sent to frontend
```

---

## ⚠️ Troubleshooting

**"ML service unavailable"**
→ Make sure `python ml_service.py` is running in a separate terminal

**"Cannot connect to MongoDB"**
→ Run `brew services start mongodb-community` (macOS) or `sudo systemctl start mongod` (Linux)

**CNN model not loading**
→ Check that `ml_models/best_model.keras` exists (large file ~19MB)
→ Install tensorflow: `pip install tensorflow==2.15.0`

**CORS errors in browser**
→ Check your frontend URL matches the allowed origins in server.js (lines 13-17)
→ Add your URL if needed: `'http://localhost:5173'`

**Weather always shows fallback data**
→ Update OPENWEATHER_API_KEY in .env with a valid key from openweathermap.org
