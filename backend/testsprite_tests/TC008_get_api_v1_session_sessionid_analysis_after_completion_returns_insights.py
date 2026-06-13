import requests
import time

BASE_URL = "http://localhost:8000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/v1/session/upload"
STATUS_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/v1/session/{{session_id}}/status"
ANALYSIS_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/v1/session/{{session_id}}/analysis"
JWT_TOKEN = "your_valid_jwt_token_here"  # Replace with a valid JWT for authentication
HEADERS = {"Authorization": f"Bearer {JWT_TOKEN}"}
TIMEOUT = 30

def test_get_session_analysis_after_completion_returns_insights():
    session_id = None
    files = {
        'file': ('test.csv', 'col1,col2\n1,2\n3,4', 'text/csv')
    }
    try:
        # Step 1: Upload CSV to create a new analysis session
        upload_response = requests.post(
            UPLOAD_ENDPOINT,
            headers=HEADERS,
            files=files,
            timeout=TIMEOUT
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        upload_data = upload_response.json()
        session_id = upload_data.get("session_id")
        assert session_id, "No session_id returned from upload."

        # Step 2: Poll session status until analysis completion (assuming status 'completed')
        status_url = STATUS_ENDPOINT_TEMPLATE.format(session_id=session_id)
        analysis_ready = False
        max_attempts = 20
        wait_seconds = 3
        for _ in range(max_attempts):
            status_response = requests.get(status_url, headers=HEADERS, timeout=TIMEOUT)
            assert status_response.status_code == 200, f"Status check failed: {status_response.text}"
            status_data = status_response.json()
            current_status = status_data.get("status") or status_data.get("pipeline_step") or status_data.get("state")
            if current_status and current_status.lower() in ["completed", "done", "finished"]:
                analysis_ready = True
                break
            time.sleep(wait_seconds)
        assert analysis_ready, "Analysis did not complete within expected time."

        # Step 3: Get the final analysis results
        analysis_url = ANALYSIS_ENDPOINT_TEMPLATE.format(session_id=session_id)
        analysis_response = requests.get(analysis_url, headers=HEADERS, timeout=TIMEOUT)
        assert analysis_response.status_code == 200, f"Analysis retrieval failed: {analysis_response.text}"
        analysis_data = analysis_response.json()

        # Validate expected keys in analysis response
        assert "insights" in analysis_data, "Insights missing in analysis response."
        assert "charts" in analysis_data, "Charts missing in analysis response."
        # Further validation can be done based on expected schema if known

    finally:
        # Clean up: delete session if API supports deletion (not specified, so skip)
        pass

test_get_session_analysis_after_completion_returns_insights()
