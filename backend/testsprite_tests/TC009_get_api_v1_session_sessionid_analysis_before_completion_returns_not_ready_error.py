import requests
import time

BASE_URL = "http://localhost:8000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/v1/session/upload"
ANALYSIS_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/v1/session/{{session_id}}/analysis"
TIMEOUT = 30

# Placeholder: Replace with a valid JWT token for authenticated requests
JWT_TOKEN = "your_valid_jwt_token_here"

# Small valid CSV content for upload
CSV_CONTENT = """col1,col2,col3
1,2,3
4,5,6
7,8,9
"""

def test_get_api_v1_session_sessionid_analysis_before_completion_returns_not_ready_error():
    headers = {
        "Authorization": f"Bearer {JWT_TOKEN}",
    }
    files = {
        "file": ("test.csv", CSV_CONTENT, "text/csv")
    }

    session_id = None
    try:
        # Step 1: Upload CSV to create a new session (starts analysis as pending)
        upload_response = requests.post(UPLOAD_ENDPOINT, headers=headers, files=files, timeout=TIMEOUT)
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.status_code} {upload_response.text}"
        upload_data = upload_response.json()
        assert "session_id" in upload_data, "Upload response missing session_id"
        assert "status" in upload_data, "Upload response missing status"
        assert upload_data["status"].lower() == "pending" or upload_data["status"].lower() == "started", "Expected session status to be pending or started"
        session_id = upload_data["session_id"]

        # Step 2: Immediately request analysis before completion
        analysis_url = ANALYSIS_ENDPOINT_TEMPLATE.format(session_id=session_id)
        analysis_response = requests.get(analysis_url, headers=headers, timeout=TIMEOUT)

        # We expect a non-200 response or a response indicating analysis not ready
        if analysis_response.status_code == 200:
            analysis_data = analysis_response.json()
            # The response may include some status field or error message; try to detect not ready state
            not_ready_indicators = [
                "not ready",
                "pending",
                "in progress",
                "processing",
                "analysis not complete",
                "not completed",
                "not finished"
            ]
            # Convert response content to lowercase string for search
            response_str = str(analysis_data).lower()
            found_indicator = any(indicator in response_str for indicator in not_ready_indicators)
            assert found_indicator, "Analysis response 200 but does not indicate analysis is not ready"
        else:
            # Non-200 status expected for analysis before completion
            assert analysis_response.status_code in [400, 401, 403, 404, 409, 422], (
                f"Unexpected status code for analysis before completion: {analysis_response.status_code}"
            )

    finally:
        # Cleanup: delete the session if API supports deletion (not detailed in PRD, so skipping)
        pass

test_get_api_v1_session_sessionid_analysis_before_completion_returns_not_ready_error()
