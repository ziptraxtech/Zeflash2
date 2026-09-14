#!/bin/bash
# Quick health check script for Zeflash services

echo "🏥 Zeflash Services Health Check"
echo "================================="
echo ""

# Check backend
echo "📦 Backend (Port 3001)..."
if curl -s http://localhost:3001/health 2>/dev/null | head -1; then
  echo "✅ Backend is running"
else
  echo "❌ Backend NOT responding on port 3001"
fi

# Check ML backend
echo ""
echo "🤖 ML Backend (Port 8000)..."
if curl -s http://localhost:8000/api/v1/health 2>/dev/null | head -1; then
  echo "✅ ML Backend is running"
else
  echo "❌ ML Backend NOT responding on port 8000"
fi

# Check frontend
echo ""
echo "🎨 Frontend (Port 5173/3000)..."
for port in 5173 3000 3002; do
  if curl -s http://localhost:$port 2>/dev/null | head -1; then
    echo "✅ Frontend found on port $port"
    break
  fi
done

# Check database
echo ""
echo "🗄️  Database..."
if command -v psql &> /dev/null; then
  if psql -U postgres -h localhost -c "SELECT 1" 2>/dev/null | grep -q "1 row"; then
    echo "✅ PostgreSQL is running"
  else
    echo "❌ PostgreSQL NOT responding"
  fi
else
  echo "⚠️  psql not installed"
fi

echo ""
echo "To start services:"
echo "  Backend:    cd backend && npm run dev"
echo "  ML Backend: cd battery-ml-lambda && python app.py"
echo "  Frontend:   npm run dev"
