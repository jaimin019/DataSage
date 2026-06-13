import requests
import io

def test_post_api_v1_session_upload_with_valid_csv_and_jwt():
    base_url = "http://localhost:8000"
    url = f"{base_url}/api/v1/session/upload"
    jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZGVtb3VzZXIiLCJpYXQiOjE2ODY2MjYwMDB9.abcdef1234567890jwtplaceholder"  # Replace with a valid JWT token for real testing

    headers = {
        "Authorization": f"Bearer {jwt_token}"
    }

    # Prepare a valid CSV file content as bytes
    csv_content = "id,name,value\n1,Alice,100\n2,Bob,200\n3,Charlie,300\n"
    files = {
        "file": ("test_data.csv", io.BytesIO(csv_content.encode('utf-8')), "text/csv")
    }

    try:
        response = requests.post(url, headers=headers, files=files, timeout=30)
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code} with body: {response.text}"

        json_resp = response.json()
        assert "session_id" in json_resp, "Response JSON missing 'session_id'"
        assert "status" in json_resp, "Response JSON missing 'status'"
        assert json_resp["status"] == "pending", f"Expected status 'pending' but got {json_resp['status']}"
        assert "dataset_info" in json_resp, "Response JSON missing 'dataset_info'"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_v1_session_upload_with_valid_csv_and_jwt()