import requests

BASE_URL = "http://localhost:8000"


def test_get_session_status_without_jwt_returns_unauthorized():
    # Since no specific session_id is provided, we will create a session first with JWT,
    # then attempt to get its status without JWT, and expect 401 Unauthorized.
    session_upload_url = f"{BASE_URL}/api/v1/session/upload"
    # Placeholder for a valid JWT token; in real tests this should be generated or retrieved securely.
    VALID_JWT = "Bearer VALID_JWT_PLACEHOLDER"
    headers_with_auth = {"Authorization": VALID_JWT}
    csv_content = "col1,col2\nval1,val2\n"
    files = {
        "file": ("test.csv", csv_content, "text/csv")
    }

    # Create the session with authorized request
    try:
        upload_response = requests.post(session_upload_url, headers=headers_with_auth, files=files, timeout=30)
        assert upload_response.status_code == 200, f"Setup failed: expected 200, got {upload_response.status_code}"
        upload_json = upload_response.json()
        session_id = upload_json.get("session_id")
        assert session_id, "Setup failed: session_id not returned"

        # Attempt to get session status WITHOUT JWT
        status_url = f"{BASE_URL}/api/v1/session/{session_id}/status"
        status_response = requests.get(status_url, timeout=30)
        assert status_response.status_code == 401, f"Expected 401 Unauthorized, got {status_response.status_code}"
    finally:
        # Clean up: delete session if delete endpoint exists, skip if not defined in PRD
        pass  # No delete endpoint defined, so nothing to clean up


test_get_session_status_without_jwt_returns_unauthorized()