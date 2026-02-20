#!/usr/bin/env python3
"""
Quick verification script for local ML testing setup.
Run this to validate that everything is configured correctly.
"""

import os
import sys
import json
from pathlib import Path

def check_directory(path, description):
    """Check if directory exists."""
    if Path(path).exists():
        print(f"✅ {description}: {path}")
        return True
    else:
        print(f"❌ {description} not found: {path}")
        return False

def check_file(path, description):
    """Check if file exists."""
    if Path(path).exists():
        print(f"✅ {description}: {path}")
        return True
    else:
        print(f"❌ {description} not found: {path}")
        return False

def check_models():
    """Verify all ML models are present."""
    print("\n📦 Checking ML Models...")
    model_dir = Path("models")
    
    required_files = [
        ("autoencoder_converted.h5", "Autoencoder Model"),
        ("scaler.pkl", "Feature Scaler"),
        ("isolation_forest.pkl", "Anomaly Detector"),
        ("config.json", "Configuration"),
        ("feature_names.json", "Feature Names"),
    ]
    
    all_present = True
    for filename, description in required_files:
        filepath = model_dir / filename
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024*1024)
            print(f"  ✅ {description}: {filename} ({size_mb:.1f}MB)")
        else:
            print(f"  ❌ {description} missing: {filename}")
            all_present = False
    
    return all_present

def check_dependencies():
    """Check if Python dependencies are installed."""
    print("\n📚 Checking Python Dependencies...")
    
    dependencies = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("tensorflow", "TensorFlow"),
        ("pandas", "Pandas"),
        ("numpy", "NumPy"),
        ("joblib", "Joblib"),
        ("matplotlib", "Matplotlib"),
        ("sklearn", "Scikit-learn"),
    ]
    
    all_installed = True
    for module_name, description in dependencies:
        try:
            __import__(module_name)
            print(f"  ✅ {description}")
        except ImportError:
            print(f"  ❌ {description} - Install with: pip install -r requirements-dev.txt")
            all_installed = False
    
    return all_installed

def check_config_files():
    """Check configuration files."""
    print("\n⚙️  Checking Configuration Files...")
    
    checks = [
        ("local-config.py", "Local Configuration"),
        ("app_dev.py", "Development App"),
        ("inference_dev.py", "Development Inference"),
        ("local_data.json", "Test Data"),
        ("start-dev-server.ps1", "Dev Server (Windows)"),
        ("start-dev-server.sh", "Dev Server (Linux/macOS)"),
    ]
    
    all_present = True
    for filename, description in checks:
        if Path(filename).exists():
            print(f"  ✅ {description}: {filename}")
        else:
            print(f"  ❌ {description} missing: {filename}")
            all_present = False
    
    return all_present

def check_test_data():
    """Validate test data format."""
    print("\n📊 Checking Test Data...")
    
    data_file = Path("local_data.json")
    if not data_file.exists():
        print("  ❌ local_data.json not found")
        return False
    
    try:
        with open(data_file) as f:
            data = json.load(f)
        
        print(f"  ✅ Test data loaded successfully")
        
        # Check structure
        for device_id, records in data.items():
            print(f"     Device: {device_id}, Records: {len(records)}")
            if records:
                print(f"     Sample: {records[0]}")
        
        return True
    except Exception as e:
        print(f"  ❌ Error loading test data: {e}")
        return False

def main():
    """Run all checks."""
    print("=" * 60)
    print("🔍 Local ML Testing Setup Verification")
    print("=" * 60)
    
    # Check current directory
    if not Path("app_dev.py").exists():
        print("\n❌ Please run this script from: battery-ml-lambda/")
        sys.exit(1)
    
    checks = [
        check_config_files(),
        check_models(),
        check_dependencies(),
        check_test_data(),
    ]
    
    print("\n" + "=" * 60)
    if all(checks):
        print("✅ All checks passed! Ready for local testing.")
        print("\n🚀 To start the development server, run:")
        print("   Windows: .\\start-dev-server.ps1")
        print("   Linux/macOS: bash start-dev-server.sh")
        return 0
    else:
        print("❌ Some checks failed. See errors above.")
        print("\n📖 Setup Instructions:")
        print("   1. Install dependencies: pip install -r requirements-dev.txt")
        print("   2. Ensure models are in ./models/ directory")
        print("   3. Check local_data.json format")
        print("   4. Re-run this script")
        return 1

if __name__ == "__main__":
    sys.exit(main())
