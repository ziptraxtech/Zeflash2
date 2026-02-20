#!/usr/bin/env python3
"""
Integration test for local ML testing setup.
Tests both backend and frontend integration.
Run after starting both servers.
"""

import time
import sys
import json
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ requests module not found. Install with: pip install requests")
    sys.exit(1)

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
TEST_DEVICE_ID = "device4"

def test_backend_health():
    """Test backend health check endpoint."""
    print("\n🏥 Testing Backend Health...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"  ✅ Backend is healthy")
        print(f"     Mode: {data.get('mode', 'unknown')}")
        print(f"     Environment: {data.get('environment', 'unknown')}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"  ❌ Cannot connect to backend at {BACKEND_URL}")
        print(f"     Did you start the dev server? (start-dev-server.ps1 or start-dev-server.sh)")
        return False
    except Exception as e:
        print(f"  ❌ Health check failed: {e}")
        return False

def test_backend_config():
    """Test backend configuration endpoint."""
    print("\n⚙️  Testing Backend Configuration...")
    try:
        response = requests.get(f"{BACKEND_URL}/config", timeout=5)
        assert response.status_code == 200
        data = response.json()
        print(f"  ✅ Configuration retrieved")
        print(f"     Environment: {data['environment']}")
        print(f"     Local Storage: {data['use_local_storage']}")
        print(f"     Local Data: {data['use_local_data']}")
        return True
    except Exception as e:
        print(f"  ❌ Configuration check failed: {e}")
        return False

def test_backend_inference():
    """Test inference endpoint."""
    print("\n🤖 Testing ML Inference...")
    try:
        payload = {"device_id": TEST_DEVICE_ID}
        response = requests.post(
            f"{BACKEND_URL}/generate-report",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        required_fields = ["device_id", "status", "anomalies", "generated_at", "image_url"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"  ✅ Report generated successfully")
        print(f"     Device: {data['device_id']}")
        print(f"     Status: {data['status']}")
        print(f"     Anomalies: {data['anomalies']}")
        print(f"     Image URL: {data['image_url']}")
        
        return True
    except Exception as e:
        print(f"  ❌ Inference test failed: {e}")
        return False

def test_local_storage():
    """Test that reports are stored locally."""
    print("\n💾 Testing Local Report Storage...")
    try:
        reports_dir = Path("battery-ml-lambda/local_reports") / TEST_DEVICE_ID
        
        if not reports_dir.exists():
            print(f"  ⚠️  Reports directory not yet created")
            return False
        
        # Count PNG files
        png_files = list(reports_dir.glob("*.png"))
        if png_files:
            print(f"  ✅ Found {len(png_files)} reports")
            latest = max(png_files, key=lambda p: p.stat().st_mtime)
            size_kb = latest.stat().st_size / 1024
            print(f"     Latest: {latest.name} ({size_kb:.1f}KB)")
            return True
        else:
            print(f"  ⚠️  No reports found in {reports_dir}")
            return False
    except Exception as e:
        print(f"  ❌ Storage check failed: {e}")
        return False

def test_frontend_connectivity():
    """Test frontend is running."""
    print("\n🌐 Testing Frontend...")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        assert response.status_code == 200
        print(f"  ✅ Frontend is running at {FRONTEND_URL}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"  ⚠️  Frontend not running at {FRONTEND_URL}")
        print(f"     Run: npm run dev (in zeflash-new directory)")
        return False
    except Exception as e:
        print(f"  ❌ Frontend check failed: {e}")
        return False

def test_local_data():
    """Validate local test data."""
    print("\n📊 Testing Local Test Data...")
    try:
        data_file = Path("battery-ml-lambda/local_data.json")
        
        if not data_file.exists():
            print(f"  ❌ local_data.json not found")
            return False
        
        with open(data_file) as f:
            data = json.load(f)
        
        if TEST_DEVICE_ID not in data:
            print(f"  ⚠️  Device '{TEST_DEVICE_ID}' not in local_data.json")
            return False
        
        records = data[TEST_DEVICE_ID]
        print(f"  ✅ Test data loaded")
        print(f"     Device: {TEST_DEVICE_ID}")
        print(f"     Records: {len(records)}")
        if records:
            print(f"     Features: {list(records[0].keys())}")
        
        return True
    except Exception as e:
        print(f"  ❌ Test data check failed: {e}")
        return False

def main():
    """Run all integration tests."""
    print("=" * 60)
    print("🧪 ML Testing Integration Tests")
    print("=" * 60)
    
    # Change to battery-ml-lambda directory for relative paths
    import os
    if os.path.exists("battery-ml-lambda"):
        os.chdir("battery-ml-lambda")
    
    tests = [
        ("Backend Health", test_backend_health),
        ("Backend Config", test_backend_config),
        ("Local Test Data", test_local_data),
        ("ML Inference", test_backend_inference),
        ("Local Storage", test_local_storage),
        ("Frontend", test_frontend_connectivity),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"  ❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} tests passed")
    print(f"{'='*60}")
    
    if passed == total:
        print("\n✅ All tests passed! Your local setup is working correctly.")
        print("\n🎯 Next steps:")
        print("   1. Open http://localhost:5173 in your browser")
        print("   2. Navigate to Battery Reports section")
        print("   3. Click 'Generate Report' to test the full pipeline")
        print("   4. Check local_reports/ directory for generated PNG")
        return 0
    else:
        print("\n❌ Some tests failed. Check the output above.")
        print("\n📖 Troubleshooting:")
        print("   - Backend not running? Run start-dev-server.ps1 (Windows)")
        print("   - Frontend not running? Run npm run dev (in zeflash-new)")
        print("   - See LOCAL_TESTING_GUIDE.md for detailed help")
        return 1

if __name__ == "__main__":
    sys.exit(main())
