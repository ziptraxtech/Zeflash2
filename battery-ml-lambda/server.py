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
API_BASE_URL = os.environ.get("API_BASE_URL", "https://uat.cms.gaadin.live/commands/secure/api/v1/get/charger/time_lapsed")
LOCAL_REPORTS_DIR = os.environ.get("LOCAL_REPORTS_DIR", None)

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

async def run_ml_inference_task(job_id: str, evse_id: str, connector_id: int, limit: int):
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
        
        # Run inference_pipeline.py
        cmd = [
            sys.executable,  # Use current Python interpreter
            "inference_pipeline.py",
            device_id,
            "--api-url", api_url,
            "--auth-token", auth_token,
            "--auth-scheme", "Bearer",  # JWT token requires Bearer auth
            "--limit", str(limit)
        ]
        
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
            jobs[job_id].result = {
                "device_id": device_id,
                "evse_id": evse_id,
                "connector_id": connector_id,
                "s3_bucket": os.environ.get("S3_BUCKET", "battery-ml-results-070872471952"),
                "s3_path": f"battery-reports/{device_id}/",
                "timestamp": datetime.now().isoformat(),
                "stdout": stdout_str[:1000],  # First 1000 chars
            }
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
        request.limit
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
