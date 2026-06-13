import requests

def test_get_api_v1_health_returns_status_ok():
    base_url = "http://localhost:8000"
    url = f"{base_url}/api/v1/health"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to health endpoint failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    assert isinstance(data, dict), "Response JSON is not a dictionary"
    # Check if the response indicates the backend service is running and healthy.
    # Assuming expected key is "status" with value "ok" based on user flow in PRD
    assert "status" in data, "Response JSON missing 'status' key"
    assert data["status"].lower() == "ok", f"Expected status 'ok' but got {data['status']}"

test_get_api_v1_health_returns_status_ok()