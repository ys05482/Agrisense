#!/bin/bash
# ============================================================
# AgriSense — One-click startup script
# Run from the agrisense-backend folder:
#   chmod +x start.sh
#   ./start.sh
# ============================================================

echo ""
echo "🌱 =========================================="
echo "   AgriSense Backend Startup"
echo "=========================================="
echo ""

# Check if we're in the right folder
if [ ! -f "server.js" ]; then
  echo "❌ Run this script from the agrisense-backend folder"
  exit 1
fi

# ── Check MongoDB ─────────────────────────────────────────────
echo "1️⃣  Checking MongoDB..."
if command -v mongod &> /dev/null; then
  if ! pgrep -x "mongod" > /dev/null; then
    echo "   Starting MongoDB..."
    brew services start mongodb-community 2>/dev/null || \
    sudo systemctl start mongod 2>/dev/null || \
    mongod --fork --logpath /tmp/mongod.log 2>/dev/null
    sleep 2
  fi
  echo "   ✅ MongoDB running"
else
  echo "   ⚠️  MongoDB not found — make sure it's installed"
  echo "      macOS: brew install mongodb-community"
  echo "      Ubuntu: sudo apt install mongodb"
fi

# ── Check Python environment ──────────────────────────────────
echo ""
echo "2️⃣  Starting Python ML Service (port 5001)..."
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# Start ML service in background
python ml_service.py &
ML_PID=$!
echo "   ✅ ML service started (PID: $ML_PID)"
sleep 3

# Check if ML service is up
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
  echo "   ✅ ML service health check passed"
else
  echo "   ⚠️  ML service may still be loading..."
fi

# ── Install Node dependencies if needed ───────────────────────
echo ""
echo "3️⃣  Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
  echo "   Installing npm packages..."
  npm install
  npm install form-data
fi
echo "   ✅ Node.js packages ready"

# ── Start Node.js backend ─────────────────────────────────────
echo ""
echo "4️⃣  Starting Node.js backend (port 3001)..."
echo ""
echo "=========================================="
echo "  🚀 All services starting!"
echo "  ML Service:  http://localhost:5001/health"
echo "  Backend API: http://localhost:3001/api/health"
echo "  Frontend:    http://localhost:5174 (start separately)"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C to kill ML service too
trap "echo ''; echo 'Stopping all services...'; kill $ML_PID 2>/dev/null; exit 0" INT

# Start Node server (foreground)
npm run dev
