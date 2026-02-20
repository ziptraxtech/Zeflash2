/**
 * ML Service - Frontend API client for Battery Health ML inference
 */

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

export interface InferenceRequest {
  evse_id: string;
  connector_id: number;
  limit?: number;
}

export interface InferenceResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: {
    device_id: string;
    evse_id: string;
    connector_id: number;
    s3_bucket: string;
    s3_path: string;
    timestamp: string;
  };
}

/**
 * Trigger ML inference for battery health analysis
 */
export async function triggerInference(request: InferenceRequest): Promise<InferenceResponse> {
  // Use direct API path (works for localhost and ECS)
  const url = `${ML_API_URL}/api/v1/inference/trigger`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger inference: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the status of an ML inference job
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const url = `${ML_API_URL}/api/v1/inference/status/${jobId}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the result of a completed ML inference job
 */
export async function getJobResult(jobId: string): Promise<any> {
  const url = `${ML_API_URL}/api/v1/inference/result/${jobId}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to get job result: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll job status until completion
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: (status: JobStatus) => void,
  pollInterval: number = 2000,
  timeout: number = 120000
): Promise<JobStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getJobStatus(jobId);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Job polling timeout');
}

/**
 * Run complete inference workflow: trigger + poll until completion
 */
export async function runInference(
  request: InferenceRequest,
  onProgress?: (status: JobStatus) => void
): Promise<JobStatus> {
  // Trigger inference
  const response = await triggerInference(request);

  // Poll until completion
  return pollJobStatus(response.job_id, onProgress);
}
