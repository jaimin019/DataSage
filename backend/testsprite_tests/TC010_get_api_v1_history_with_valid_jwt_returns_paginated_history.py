import requests

BASE_URL = "http://localhost:8000"
HISTORY_ENDPOINT = "/api/v1/history"
JWT_TOKEN = "your_valid_jwt_token_here"  # Replace with a valid JWT token for authentication


def test_get_api_v1_history_with_valid_jwt_returns_paginated_history():
    url = f"{BASE_URL}{HISTORY_ENDPOINT}"
    headers = {"Authorization": f"Bearer {JWT_TOKEN}"}
    timeout = 30

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    json_response = response.json()
    assert isinstance(json_response, dict), "Response is not a JSON object"

    # Basic pagination structure checks
    assert 'items' in json_response, "'items' key not found in response"
    assert isinstance(json_response['items'], list), "'items' is not a list"

    pagination_keys = ['total', 'page', 'size', 'pages']
    for key in pagination_keys:
        if key in json_response:
            assert isinstance(json_response[key], int), f"'{key}' should be an integer"

    if json_response['items']:
        item = json_response['items'][0]
        assert isinstance(item, dict), "Item in history 'items' is not a JSON object"
        assert 'id' in item or 'session_id' in item, "Session ID not found in item"
        assert 'status' in item, "Session status not found in item"


test_get_api_v1_history_with_valid_jwt_returns_paginated_history()