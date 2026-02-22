"""
Local development configuration for testing ML inference without AWS dependencies.
"""
import os
from pathlib import Path

# Environment mode
ENV = os.getenv("ENV", "development")  # development or production

# Model paths
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(__file__), "models"))

# Database - use local JSON or DynamoDB
USE_LOCAL_DATA = os.getenv("USE_LOCAL_DATA", "true").lower() == "true"
LOCAL_DATA_FILE = os.path.join(os.path.dirname(__file__), "local_data.json")

# S3 Configuration
USE_LOCAL_STORAGE = os.getenv("USE_LOCAL_STORAGE", "true").lower() == "true"
LOCAL_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "local_reports")

# AWS (only used if USE_LOCAL_STORAGE is false)
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
RESULTS_BUCKET = os.getenv("RESULTS_BUCKET_NAME", "battery-ml-results-test")
RESULTS_PREFIX = os.getenv("RESULTS_PREFIX", "battery-reports/")

# DynamoDB Configuration (only used if USE_LOCAL_DATA is false)
BATTERY_TABLE_NAME = os.getenv("BATTERY_TABLE_NAME", "BatteryChargingData")
DEVICE_KEY_NAME = os.getenv("DEVICE_KEY_NAME", "device_id")

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = ENV == "development"

# Create necessary directories
Path(LOCAL_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(MODEL_DIR).mkdir(parents=True, exist_ok=True)

print(f"🚀 Configuration loaded (ENV={ENV})")
print(f"   Model directory: {MODEL_DIR}")
print(f"   Local data: {USE_LOCAL_DATA}")
print(f"   Local storage: {USE_LOCAL_STORAGE}")
