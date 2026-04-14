# Unified Dockerfile - Backend (Node.js) + ML (Python) in one container
# Build Node.js backend first
FROM node:22-alpine AS builder

WORKDIR /app/backend

# Copy package files and Prisma schema first (needed for postinstall)
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY backend/src ./src

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Runtime stage - Combined Python + Node.js
FROM python:3.11-slim

# Install Node.js runtime in Python image
RUN apt-get update && apt-get install -y \
    nodejs npm curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma

# Install production dependencies only (from backend dir)
WORKDIR /app/backend
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/backend/dist ./dist

# Copy ML service
WORKDIR /app
COPY battery-ml-lambda ./ml-service

# Install Python dependencies for ML
WORKDIR /app/ml-service
RUN pip install --no-cache-dir -r requirements.txt

# Create unified startup script
WORKDIR /app
RUN echo '#!/bin/sh\n\
echo "🚀 Starting unified Battery ML + Backend service..."\n\
\n\
# Start Python ML server in background on port 8000\n\
echo "📡 Starting ML server (FastAPI) on port 8000..."\n\
cd /app/ml-service && python server.py > /tmp/ml-server.log 2>&1 &\n\
ML_PID=$!\n\
echo "✅ ML server started (PID: $ML_PID)"\n\
sleep 4\n\
\n\
# Start Node.js backend on port 3000 (acts as proxy to ML)\n\
echo "🎯 Starting Backend server (Express) on port 3000..."\n\
cd /app/backend\n\
export PORT=3000\n\
export NODE_ENV=production\n\
export ML_BACKEND_URL=${ML_BACKEND_URL:-http://44.197.181.236:8000}\n\
exec node --max-old-space-size=512 /app/backend/dist/index.js\n\
' > /app/start-unified.sh && chmod +x /app/start-unified.sh

# Run Prisma generate
WORKDIR /app/backend
RUN npx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose only port 3000 externally (8000 is internal to container)
EXPOSE 3000

# Start unified service
ENTRYPOINT ["/app/start-unified.sh"]
