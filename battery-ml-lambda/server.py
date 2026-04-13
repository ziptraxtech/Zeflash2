"""
FastAPI Server for Battery Health ML Inference
Triggers ML model execution on-demand via API endpoints
"""

import os
import sys
import json
import uuid
import asyncio
import subprocess
import requests
from datetime import datetime
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

from fastapi.responses import FileResponse

# Load environment variables from .env file
load_dotenv()

# ============ Configuration ============
TOKEN_ENDPOINT = os.environ.get("TOKEN_ENDPOINT", "https://cms.charjkaro.in/admin/api/v1/zipbolt/token")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed")
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://zipbolt-backend-service:3001")  # Backend URL for saving results in Neon DB

# ============ FastAPI App ============
app = FastAPI(
    title="Battery Health ML API",
    description="On-demand ML inference for battery health analysis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Data Models ============
class InferenceRequest(BaseModel):
    evse_id: str
    connector_id: int
    limit: int = 100
    station_name: Optional[str] = None  # Optional station/location name

class InferenceResponse(BaseModel):
    job_id: str
    status: str
    message: str

class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, running, completed, failed
    progress: int  # 0-100
    message: str
    result: Optional[Dict] = None

# ============ Job Management ============
jobs: Dict[str, JobStatus] = {}

def get_auth_token() -> str:
    """Fetch authentication token from the API"""
    try:
        response = requests.get(TOKEN_ENDPOINT, timeout=10)
        response.raise_for_status()
        data = response.json()
        # Try different possible token field names
        token = (data.get("token") or 
                data.get("data", {}).get("accessToken") or 
                data.get("data", {}).get("token") or 
                data.get("accessToken") or "")
        print(f"[OK] Got auth token (first 20 chars): {token[:20]}..." if token else "[WARN] No token found")
        print(f"Token endpoint response keys: {list(data.keys())}")
        return token
    except Exception as e:
        print(f"Error fetching auth token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch auth token: {str(e)}")

def save_inference_result_to_db(result: Dict) -> bool:
    """Save inference result to Neon database via backend API"""
    try:
        if not result:
            print("[WARN] No result to save to database")
            return False
        
        print(f"[DB] Starting database save for device_id: {result.get('device_id')}")
        
        # Format for API
        payload = {
            "device_id": result.get("device_id"),
            "evse_id": result.get("evse_id", result.get("device_id", "").split("_")[0]),
            "connector_id": result.get("connector_id", 1),
            "status": result.get("status"),
            "anomalies": result.get("anomalies", {}),
            "total_samples": result.get("total_samples", 0),
            "total_anomalies": result.get("total_anomalies", 0),
            "generated_at": result.get("generated_at"),
            "data_points": result.get("data_points", 0),
            "s3_url": result.get("s3_url", ""),
            "s3_key": result.get("s3_key", ""),
            "timing": result.get("timing", {})
        }
        
        print(f"[DB] Payload: {payload}")
        
        # Save to database
        url = f"{BACKEND_API_URL}/api/inference/results"
        print(f"[DB] Sending POST to: {url}")
        
        response = requests.post(
            url,
            json=payload,
            timeout=10
        )
        
        print(f"[DB] Response status: {response.status_code}")
        print(f"[DB] Response body: {response.text[:300]}")
        
        if response.status_code in [200, 201]:
            print(f"[OK] Inference result saved to database for {payload['device_id']}")
            return True
        else:
            print(f"[WARN] Failed to save to database: {response.status_code} - {response.text}")
            return False
    
    except Exception as e:
        print(f"[WARN] Error saving to database: {e}")
        import traceback
        traceback.print_exc()
        return False

async def run_ml_inference_task(job_id: str, evse_id: str, connector_id: int, limit: int, station_name: Optional[str] = None):
    """Background task to run ML inference"""
    try:
        # Update job status
        jobs[job_id].status = "running"
        jobs[job_id].progress = 10
        jobs[job_id].message = "Fetching authentication token..."
        
        # Get auth token
        auth_token = get_auth_token()
        
        jobs[job_id].progress = 20
        jobs[job_id].message = "Building API request..."
        
        # Construct API URL
        api_url = f"{API_BASE_URL}?role=Admin&operator=All&evse_id={evse_id}&connector_id={connector_id}&page=1"
        
        jobs[job_id].progress = 30
        jobs[job_id].message = "Running ML inference pipeline..."
        
        # Build device_id
        device_id = f"{evse_id}_{connector_id}"
        
        # Note: AWS credentials are automatically provided by IAM role in ECS
        # For local development, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env
        
        # Run inference_pipeline.py with optional station name
        cmd = [
            sys.executable,  # Use current Python interpreter
            "inference_pipeline.py",
            device_id,
            "--api-url", api_url,
            "--auth-token", auth_token,
            "--auth-scheme", "Bearer",  # JWT token requires Bearer auth
            "--limit", str(limit)
        ]
        
        # Add station name if provided
        if station_name:
            cmd.extend(["--station-name", station_name])
        
        jobs[job_id].progress = 40
        jobs[job_id].message = "Executing ML models..."
        
        # Create subprocess environment without AWS credentials 
        # This forces boto3 to use IAM role credentials in ECS
        subprocess_env = os.environ.copy()
        subprocess_env.pop('AWS_ACCESS_KEY_ID', None)
        subprocess_env.pop('AWS_SECRET_ACCESS_KEY', None)
        subprocess_env.pop('AWS_SESSION_TOKEN', None)
        
        # Execute the command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env=subprocess_env
        )
        
        stdout, stderr = await process.communicate()
        
        stdout_str = stdout.decode('utf-8', errors='replace') if stdout else ""
        stderr_str = stderr.decode('utf-8', errors='replace') if stderr else ""
        
        print(f"[Job {job_id}] STDOUT: {stdout_str[:2000]}")  # Print first 2000 chars
        print(f"[Job {job_id}] STDERR: {stderr_str[:2000]}")
        print(f"[Job {job_id}] Return code: {process.returncode}")
        
        if process.returncode == 0:
            jobs[job_id].status = "completed"
            jobs[job_id].progress = 100
            jobs[job_id].message = "ML inference completed successfully"
            
            # Parse result from stdout
            import json
            result = None
            print(f"[Job {job_id}] Parsing inference result from stdout...")
            
            # Look for a single-line JSON output from inference_pipeline.py
            for line in stdout_str.split('\n'):
                line = line.strip()
                if not line.startswith('{'):
                    continue
                    
                try:
                    result = json.loads(line)
                    # Verify this is the result object with expected fields
                    if 'anomalies' in result and 's3_url' in result:
                        print(f"[Job {job_id}] [OK] Successfully parsed result: {list(result.keys())}")
                        break
                except json.JSONDecodeError as e:
                    print(f"[Job {job_id}] JSON parse error: {e}")
            
            if result is None:
                print(f"[Job {job_id}] WARNING: Could not parse inference result from stdout!")
                print(f"[Job {job_id}] Last 500 chars of stdout: {stdout_str[-500:]}")
                result = {}
            
            # Extract path from result - use actual values from inference
            s3_url = result.get("s3_url", "")
            s3_key = result.get("s3_key", "")
            
            print(f"[Job {job_id}] Result contains:")
            print(f"  - s3_url: {s3_url}")
            print(f"  - s3_key: {s3_key}")
            print(f"  - anomalies: {result.get('anomalies', {})}")
            print(f"  - total_samples: {result.get('total_samples', 0)}")
            print(f"  - total_anomalies: {result.get('total_anomalies', 0)}")
            print(f"  - recommendations: {result.get('recommendations', [])}")
            
            # Use actual result from inference pipeline, or fallback to local path
            jobs[job_id].result = {
                "device_id": device_id,
                "evse_id": evse_id,
                "connector_id": connector_id,
                "status": result.get("status", "unknown"),
                "anomalies": result.get("anomalies", {}),
                "total_samples": result.get("total_samples", 0),
                "total_anomalies": result.get("total_anomalies", 0),
                "anomaly_percentage": result.get("anomaly_percentage", 0),
                "recommendations": result.get("recommendations", []),
                "s3_path": s3_url or f"battery-reports/{device_id}/battery_health_report.png",
                "s3_url": s3_url or f"battery-reports/{device_id}/battery_health_report.png",
                "timestamp": datetime.now().isoformat(),
            }
            print(f"[Job {job_id}] Job result prepared: {list(jobs[job_id].result.keys())}")
            print(f"[Job {job_id}] Final recommendations in response: {jobs[job_id].result.get('recommendations', [])}")
            
            # Save to database (non-blocking via threading)
            if result:
                print(f"[Job {job_id}] [INFO] Preparing database save payload...")
                response_data = {
                    "device_id": device_id,
                    "evse_id": evse_id,
                    "connector_id": connector_id,
                    "status": result.get("status", "Unknown"),
                    "anomalies": result.get("anomalies", {}),
                    "total_samples": result.get("total_samples", 0),
                    "total_anomalies": result.get("total_anomalies", 0),
                    "generated_at": result.get("generated_at", datetime.now().isoformat()),
                    "data_points": result.get("data_points", 0),
                    "s3_url": result.get("s3_url", ""),
                    "s3_key": result.get("s3_key", ""),
                    "timing": {
                        "inference_time_ms": result.get("inference_time_ms", 0),
                        "total_time_ms": result.get("total_time_ms", 0)
                    }
                }
                
                import threading
                db_thread = threading.Thread(
                    target=save_inference_result_to_db,
                    args=(response_data,),
                    daemon=True
                )
                db_thread.start()
                print(f"[Job {job_id}] [OK] Database save triggered in background thread")
            else:
                print(f"[Job {job_id}] [WARNING] Skipping database save - result is None")
        else:
            # Extract the actual error from stdout (where our script prints errors)
            error_lines = []
            for line in stdout_str.split('\n'):
                if '[ERROR]' in line or 'ERROR:' in line or 'ValueError' in line or 'Exception' in line or 'Traceback' in line:
                    error_lines.append(line.strip())
            
            error_msg = '\n'.join(error_lines[-5:]) if error_lines else (stderr_str[:500] if stderr_str else "Process failed")
            
            # Show more context from stdout for debugging
            jobs[job_id].status = "failed"
            jobs[job_id].message = f"ML inference failed:\n{error_msg}\n\nLast output:\n{stdout_str[-800:]}"
            
    except Exception as e:
        jobs[job_id].status = "failed"
        jobs[job_id].message = f"Error: {str(e)}"
        print(f"Error in ML inference task {job_id}: {e}")
        import traceback
        traceback.print_exc()

# ============ API Endpoints ============

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Battery Health ML API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "trigger_inference": "/api/v1/inference/trigger",
            "job_status": "/api/v1/inference/status/{job_id}",
            "job_result": "/api/v1/inference/result/{job_id}"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/v1/inference/trigger", response_model=InferenceResponse)
async def trigger_inference(request: InferenceRequest, background_tasks: BackgroundTasks):
    """
    Trigger ML inference for battery health analysis
    
    - **evse_id**: EVSE identifier (e.g., "FLX_HDCHIN22")
    - **connector_id**: Connector number (e.g., 1)
    - **limit**: Number of datapoints to fetch (default: 60)
    """
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Create job entry
    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        progress=0,
        message="Job queued"
    )
    
    # Add background task
    background_tasks.add_task(
        run_ml_inference_task,
        job_id,
        request.evse_id,
        request.connector_id,
        request.limit,
        request.station_name  # Pass optional station name
    )
    
    return InferenceResponse(
        job_id=job_id,
        status="pending",
        message="ML inference job started"
    )

@app.get("/api/v1/inference/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of an ML inference job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]

@app.get("/api/v1/inference/result/{job_id}")
async def get_job_result(job_id: str):
    """Get the result of a completed ML inference job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet. Current status: {job.status}"
        )
    
    return {
        "job_id": job_id,
        "status": job.status,
        "result": job.result
    }

@app.post("/api/v1/infer")
async def run_inference_direct(request: InferenceRequest):
    """
    Direct inference endpoint - returns standardized JSON response
    
    Returns:
    {
      "device_id": "EVSE_ID_CONNECTOR",
      "status": "Stable",
      "anomalies": {"critical": 0, "high": 2, "medium": 0, "low": 10},
      "total_samples": 25,
      "total_anomalies": 12,
      "generated_at": "2026-03-13T10:30:45...",
      "data_points": 25,
      "s3_url": "https://...",
      "timing": {"inference_time_ms": 250, "total_time_ms": 1200}
    }
    """
    import time
    start_time = time.time()
    
    try:
        # Build device ID
        device_id = f"{request.evse_id}_{request.connector_id}"
        
        # Get auth token
        auth_token = get_auth_token()
        
        # Build API URL
        api_url = f"{API_BASE_URL}?role=Admin&operator=All&evse_id={request.evse_id}&connector_id={request.connector_id}&page=1&limit={request.limit}"
        
        # Run inference pipeline in subprocess
        inference_start = time.time()
        cmd = [
            sys.executable,
            "inference_pipeline.py",
            device_id,
            "--api-url", api_url,
            "--auth-token", auth_token,
            "--auth-scheme", "Bearer",
            "--limit", str(request.limit)
        ]
        
        # Create subprocess environment
        subprocess_env = os.environ.copy()
        subprocess_env.pop('AWS_ACCESS_KEY_ID', None)
        subprocess_env.pop('AWS_SECRET_ACCESS_KEY', None)
        subprocess_env.pop('AWS_SESSION_TOKEN', None)
        
        # Execute inference
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env=subprocess_env
        )
        
        stdout, stderr = await process.communicate()
        inference_time = int((time.time() - inference_start) * 1000)
        
        stdout_str = stdout.decode('utf-8', errors='replace') if stdout else ""
        stderr_str = stderr.decode('utf-8', errors='replace') if stderr else ""
        
        if process.returncode != 0:
            error_msg = stderr_str if stderr_str else stdout_str[-500:]
            raise HTTPException(
                status_code=500,
                detail=f"Inference failed: {error_msg}"
            )
        
        # Parse result from stdout (last JSON object)
        import json
        result = None
        for line in reversed(stdout_str.split('\n')):
            try:
                if line.strip().startswith('{'):
                    result = json.loads(line)
                    break
            except:
                continue
        
        if not result:
            raise HTTPException(
                status_code=500,
                detail="Could not parse inference results"
            )
        
        # Format standardized response
        total_time = int((time.time() - start_time) * 1000)
        
        response_data = {
            "device_id": device_id,
            "evse_id": request.evse_id,
            "connector_id": request.connector_id,
            "status": result.get("status", "Unknown"),
            "anomalies": result.get("anomalies", {}),
            "total_samples": result.get("total_samples", 0),
            "total_anomalies": result.get("total_anomalies", 0),
            "generated_at": result.get("generated_at", datetime.now().isoformat()),
            "data_points": result.get("data_points", 0),
            "s3_url": result.get("s3_url", ""),
            "s3_key": result.get("s3_key", ""),
            "timing": {
                "inference_time_ms": inference_time,
                "total_time_ms": total_time
            }
        }
        
        # Save to database (non-blocking)
        import threading
        db_thread = threading.Thread(
            target=save_inference_result_to_db,
            args=(response_data,),
            daemon=True
        )
        db_thread.start()
        
        return response_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error running inference: {str(e)}"
        )

@app.get("/api/v1/reports/{device_id}/battery_health_report.png")
@app.head("/api/v1/reports/{device_id}/battery_health_report.png")
async def get_local_report_image(device_id: str):
    """Serve locally saved report images for testing (supports GET and HEAD methods)"""
    if not LOCAL_REPORTS_DIR:
        raise HTTPException(status_code=404, detail="Local reports not enabled")
    
    image_path = os.path.join(LOCAL_REPORTS_DIR, device_id, "battery_health_report.png")
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Report image not found")
    
    return FileResponse(image_path, media_type="image/png")

# ============ Run Server ============
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("Starting Battery Health ML API Server")
    print("=" * 60)
    print(f"Server: http://localhost:8000")
    print(f"API Docs: http://localhost:8000/docs")
    print(f"Health Check: http://localhost:8000/health")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
