# Battery Health ML - How Calculations Work

## Understanding Sample Counts

### Why Sample Counts Differ Between Devices

The **total samples** shown in reports can vary between devices for several reasons:

1. **API Response Size**: 
   - The system requests a `limit` number of records (default: 10-60)
   - Different EVSE IDs may have different amounts of data available
   - API might return fewer records than requested if data is sparse

2. **Data Filtering**:
   - Raw API data → Filtered for valid measurements
   - Records missing `current`, `temperature`, or `timestamp` are dropped
   - NaN values in critical fields cause record removal

3. **Feature Engineering Requirements**:
   - Minimum 3 valid data points needed for calculations
   - Rolling window operations need sufficient data
   - First few rows may be dropped due to diff/rolling operations

---

## Step-by-Step Data Flow

### 1. **Fetch Data from API**
```
Input:  API URL + limit parameter (e.g., limit=60)
Output: Raw JSON with N records (e.g., 60 items)
```

**What happens:**
- System calls the API endpoint
- Receives JSON response with device measurements
- Parses nested payload structure

**Check this:**
```python
# In terminal output, look for:
"[OK] Fetched X data points from API"
```

---

### 2. **Transform & Filter Data**
```
Input:  60 raw JSON items
Output: M valid data points (e.g., 55 items)
```

**What happens:**
- Extract `ts` (timestamp), `current`, `temperature` from complex payload
- Convert timestamps to Unix epoch
- Drop records where:
  - Any field is missing
  - Values cannot be converted to numbers
  - Timestamps are invalid

**Check this:**
```python
# System prints:
"Could not extract required fields from X items"  # If all fail
# OR continues with valid items
```

**Why items are dropped:**
- Missing measurements (sensor offline)
- Invalid data format (JSON parsing errors)
- Zero or negative timestamps

---

### 3. **Build Features (28 Total)**
```
Input:  55 valid records
Output: 52 feature vectors (final samples)
```

**What happens:**
```
Original Features (2):
  • current        - Battery current (A)
  • temperature    - Battery temperature (°C)

Derived Features (26):
  • Differences (6):
    - current_diff, current_diff_abs, current_pct_change
    - temperature_diff, temperature_diff_abs, temperature_pct_change
  
  • Rolling Statistics (10):
    - current_roll_mean, current_roll_std, current_roll_min, current_roll_max
    - temperature_roll_mean, temperature_roll_std, temperature_roll_min, temperature_roll_max
    - current_deviation, temperature_deviation
  
  • Rate Features (2):
    - current_rate (change per second)
    - temperature_rate (change per second)
  
  • Volatility (2):
    - current_volatility
    - temperature_volatility
  
  • Time Features (6):
    - hour, minute, day_of_week, is_weekend, hour_sin, hour_cos
```

**Why samples are dropped here:**
- First row: No previous value for diff operations (loses 1-2 rows)
- Rolling window warmup: First few rows don't have full window (adaptive)
- NaN handling: Filled with 0 instead of dropping

**Check this:**
```python
# Terminal output shows:
"[OK] Built features: shape (X, 28)"
# X = final sample count used for ML
```

---

### 4. **ML Inference**
```
Input:  52 samples × 28 features
Output: 52 reconstruction errors
```

**What happens:**
- Scale features using RobustScaler (trained on 3.6M samples)
- Autoencoder predicts → calculates reconstruction error per sample
- Adaptive threshold:
  - If median error > 2× training threshold → use 85th percentile
  - Else → use fixed threshold (0.20)

**Check this:**
```python
# Terminal shows:
"[OK] Reconstruction error range: [min, max]"
"- Using adaptive threshold (85th percentile): X.XXXX"
# OR
"- Using training threshold: 0.2000"
```

---

### 5. **Anomaly Detection**
```
Input:  52 reconstruction errors
Output: Count of anomalies (e.g., 8 anomalies)
```

**What happens:**
- Compare each reconstruction error to threshold
- If error > threshold → FLAG as anomaly
- Classify severity based on current/temperature extremes:
  ```
  Critical: temp ≥ 80°C OR current ≥ 100A
  High:     temp ≥ 70°C OR current ≥ 2A
  Medium:   temp ≥ 60°C OR current ≥ 0A
  Low:      Everything else
  ```

**Check this:**
```python
# Terminal shows:
"- Anomalies detected: X/52 (Y.Y%)"

# Breakdown:
"Anomaly Breakdown:"
"  - Critical: X"
"  - High: Y"
"  - Medium: Z"
"  - Low: W"
```

---

### 6. **Status Calculation**
```
Anomaly Rate = (Total Anomalies / Total Samples) × 100%
```

**Status Levels:**
```
< 10%   → SAFE      (Green)
10-33%  → NORMAL    (Light Green)
33-50%  → WARNING   (Orange)
50-75%  → CAUTION   (Dark Orange)
> 75%   → DANGER    (Red)
```

---

## Cross-Checking Calculations

### Method 1: Check Terminal Output

When the backend processes a request, it prints detailed logs:

```bash
# 1. Data fetching
[OK] Fetched 60 data points from API

# 2. Feature building
Not enough data points to compute features. Got 2, need at least 3
# OR
[OK] Built features: shape (52, 28)

# 3. Autoencoder
[OK] Reconstruction error range: [0.0145, 2.3456]
- Mean error: 0.4523, Median: 0.3821
- Using adaptive threshold (85th percentile): 0.9876
- Anomalies detected: 8/52 (15.4%)

# 4. Final result
Anomaly Breakdown:
  - Critical: 1
  - High: 2
  - Medium: 3
  - Low: 2

[STATUS] Overall Status: NORMAL
```

### Method 2: Check Backend API Response

Make a direct API call:
```bash
curl http://localhost:8000/api/v1/inference \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "122300103C03183_1",
    "api_url": "https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed?role=Admin&operator=All&evse_id=122300103C03183&connector_id=1&page=1&limit=60",
    "auth_token": "YOUR_TOKEN"
  }'
```

Response includes:
```json
{
  "device_id": "122300103C03183_1",
  "status": "NORMAL",
  "total_samples": 52,
  "total_anomalies": 8,
  "anomalies": {
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 2
  },
  "data_points": 60
}
```

**Key fields to compare:**
- `data_points`: Original records from API (e.g., 60)
- `total_samples`: Final samples after processing (e.g., 52)
- `total_anomalies`: Count of flagged samples (e.g., 8)

---

## Common Questions

### Q1: Why is total_samples less than data_points?

**A:** Data gets filtered at multiple stages:
- Invalid/missing measurements
- Feature engineering drops first few rows
- NaN handling (though we use fillna(0) now)

**Example:**
```
60 API records
→ 58 valid records (2 had missing temperature)
→ 56 after transformation (2 had invalid timestamps)
→ 52 final samples (rolling window needs 2-3 initial rows)
```

### Q2: Why do different devices show different sample counts with same limit?

**A:** Each device has different:
- Data quality (some sensors report intermittently)
- Measurement frequency
- Missing value patterns

**Example:**
```
Device A: limit=60 → 55 samples (good data quality)
Device B: limit=60 → 38 samples (many missing values)
Device C: limit=60 → 60 samples (perfect data)
```

### Q3: How can I get more samples?

**A:** Increase the `limit` parameter in the API request:
```python
# In server.py or frontend, change:
limit = 60  # Default
# to:
limit = 100  # More data
```

**Note:** More samples = better accuracy but slower processing

### Q4: What does adaptive threshold mean?

**A:** The system uses two strategies:

**Strategy 1: Fixed Threshold (0.20)**
- Used when device data is similar to training data
- Trained on 3.6M samples from 11 lab devices
- Good for comparison to baseline

**Strategy 2: Adaptive (85th Percentile)**
- Used when device data is very different from training
- Takes top 15% of errors as anomalies
- Prevents false 100% anomaly rates

**Logic:**
```python
if median_error > (training_threshold × 2.0):
    use 85th percentile  # Device data very different
else:
    use 0.20             # Device data similar to training
```

### Q5: How do I verify the calculations are correct?

**Method 1: Manual Calculation**
1. Get `total_samples` from report (e.g., 52)
2. Get `total_anomalies` from report (e.g., 8)
3. Calculate: `8 / 52 × 100% = 15.4%`
4. Verify status: 15.4% → NORMAL (10-33% range) ✓

**Method 2: Compare Multiple Requests**
1. Generate report for same device twice
2. Sample counts should be similar (may vary slightly if new data arrived)
3. Anomaly rates should be consistent

**Method 3: Check Backend Logs**
- Terminal output shows all intermediate calculations
- Verify each step matches your expectations

---

## Debugging Checklist

If you see unexpected results:

- [ ] **Check API response**: Is the API returning data?
  ```
  Look for: "[OK] Fetched X data points from API"
  ```

- [ ] **Check data quality**: Are measurements valid?
  ```
  Look for: "[OK] Built features: shape (X, 28)"
  If X < data_points, some records were invalid
  ```

- [ ] **Check threshold**: Which threshold is being used?
  ```
  Look for: "Using adaptive threshold" OR "Using training threshold"
  ```

- [ ] **Check anomaly count**: Are anomalies reasonable?
  ```
  Look for: "Anomalies detected: X/Y (Z.Z%)"
  Should not be 0% or 100% (usually indicates issue)
  ```

- [ ] **Check status mapping**: Does percentage match status?
  ```
  15% → NORMAL ✓
  5%  → SAFE ✓
  85% → DANGER ✓
  ```

---

## Example Calculation Walkthrough

**Device ID:** `122300103C03183_1`

### Step 1: Fetch Data
```
API limit: 60
API returned: 60 records
```

### Step 2: Transform
```
Valid records: 58 (2 missing temperature)
```

### Step 3: Build Features
```
After feature engineering: 55 samples
(3 lost to rolling window warmup)
```

### Step 4: ML Inference
```
Reconstruction errors:
  Min: 0.045
  Max: 1.234
  Median: 0.289
  Mean: 0.347

Threshold decision:
  median (0.289) < training_threshold × 2 (0.40)
  → Use training threshold: 0.20
```

### Step 5: Detect Anomalies
```
Count errors > 0.20:
  27 out of 55 samples → 49.1%

Classify by severity:
  Critical: 5 (temp > 80°C)
  High: 8     (temp > 70°C)
  Medium: 10  (temp > 60°C)
  Low: 4      (others)
```

### Step 6: Determine Status
```
Anomaly rate: 49.1%
Status range: 33-50% → WARNING
```

### Result:
```json
{
  "total_samples": 55,
  "total_anomalies": 27,
  "anomaly_rate": 49.1,
  "status": "WARNING",
  "anomalies": {
    "critical": 5,
    "high": 8,
    "medium": 10,
    "low": 4
  }
}
```

---

## Need Help?

1. **Check terminal logs** - Most detailed information
2. **Compare data_points vs total_samples** - Shows how much data was filtered
3. **Verify threshold used** - Affects anomaly detection
4. **Check status calculation manually** - `total_anomalies / total_samples × 100%`

If results still seem wrong, share:
- Terminal output
- Device ID
- Expected vs actual results
