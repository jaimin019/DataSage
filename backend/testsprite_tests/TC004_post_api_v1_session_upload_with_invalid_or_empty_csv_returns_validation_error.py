import requests

BASE_URL = "http://localhost:8000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/v1/session/upload"
TIMEOUT = 30

# Replace with a valid JWT token for authenticated requests
JWT_TOKEN = "your_valid_jwt_token_here"

def test_post_api_v1_session_upload_with_invalid_or_empty_csv_returns_validation_error():
    headers = {
        "Authorization": f"Bearer {JWT_TOKEN}"
    }
    # Prepare invalid CSV content (empty file)
    files = {
        "file": ("empty.csv", "", "text/csv")
    }

    try:
        response = requests.post(UPLOAD_ENDPOINT, headers=headers, files=files, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Assert that the response status code is 400 Bad Request
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    # Optionally check response content for validation error message
    try:
        resp_json = response.json()
        assert "error" in resp_json or "detail" in resp_json, "Response does not contain expected error details"
    except ValueError:
        assert False, "Response is not valid JSON"


test_post_api_v1_session_upload_with_invalid_or_empty_csv_returns_validation_error()