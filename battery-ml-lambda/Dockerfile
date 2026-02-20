FROM python:3.10-slim

WORKDIR /app

# System dependencies for ML & plotting
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1 \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code & models
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

# Use server.py (API-based inference) instead of app.py (Lambda/DynamoDB)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]