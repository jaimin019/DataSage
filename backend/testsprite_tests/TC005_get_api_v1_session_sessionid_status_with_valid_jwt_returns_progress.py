import requests
import time

BASE_URL = "http://localhost:8000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/v1/session/upload"
STATUS_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/v1/session/{{session_id}}/status"
TIMEOUT = 30

# Placeholder for a valid JWT token for authentication. Replace with actual token for real tests.
VALID_JWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ValidTokenExample"

def test_get_session_status_with_valid_jwt_returns_progress():
    session_id = None
    headers_upload = {
        "Authorization": VALID_JWT
    }
    # Use a small valid CSV content for upload
    csv_content = "col1,col2\n1,2\n3,4\n"
    
    files = {
        "file": ("test.csv", csv_content, "text/csv")
    }

    try:
        # Step 1: Create a new session by uploading a CSV file
        upload_response = requests.post(
            UPLOAD_ENDPOINT,
            headers=headers_upload,
            files=files,
            timeout=TIMEOUT
        )
        assert upload_response.status_code == 200, f"Upload failed with status {upload_response.status_code}"
        upload_data = upload_response.json()
        assert "session_id" in upload_data, "Response missing 'session_id'"
        assert upload_data.get("status") in ("pending", "in_progress"), "Unexpected initial session status"
        session_id = upload_data["session_id"]

        headers_status = {
            "Authorization": VALID_JWT
        }

        # Step 2: Poll the session status endpoint until progress info is available or timeout
        max_wait_time_seconds = 60
        poll_interval_seconds = 5
        elapsed = 0
        status_data = None

        while elapsed < max_wait_time_seconds:
            status_response = requests.get(
                STATUS_ENDPOINT_TEMPLATE.format(session_id=session_id),
                headers=headers_status,
                timeout=TIMEOUT
            )
            if status_response.status_code == 200:
                status_data = status_response.json()
                # Check for expected fields indicating progress
                current_step = status_data.get("current_pipeline_step")
                progress = status_data.get("progress")
                if current_step is not None and progress is not None:
                    break
            elif status_response.status_code == 404:
                assert False, f"Session status not found for session_id {session_id}"
            elif status_response.status_code == 401:
                assert False, "Unauthorized access to session status with valid JWT"
            time.sleep(poll_interval_seconds)
            elapsed += poll_interval_seconds
        else:
            assert False, "Timeout waiting for session progress details"

        # Assert that current_pipeline_step is a non-empty string
        assert isinstance(current_step, str) and current_step, "Invalid or empty current_pipeline_step in response"
        # Assert that progress is a number between 0 and 100 or a valid type depending on API spec
        assert (isinstance(progress, (int, float)) and 0 <= progress <= 100) or isinstance(progress, dict), \
            "Invalid progress value in response"

    finally:
        # Clean up: delete the created session if API supports it (not in provided PRD, so skipping)
        pass

test_get_session_status_with_valid_jwt_returns_progress()
