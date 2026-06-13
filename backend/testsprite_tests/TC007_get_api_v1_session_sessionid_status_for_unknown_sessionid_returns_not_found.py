import requests

BASE_URL = "http://localhost:8000//Users/onlymac/Desktop/projects/DataSage/backend"

def test_get_session_status_unknown_sessionid_returns_not_found():
    unknown_session_id = "00000000-0000-0000-0000-000000000000"  # A UUID format session id unlikely to exist
    url = f"{BASE_URL}/api/v1/session/{unknown_session_id}/status"
    headers = {
        "Authorization": "Bearer valid_jwt_token"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 404, f"Expected 404 Not Found, got {response.status_code}"

test_get_session_status_unknown_sessionid_returns_not_found()