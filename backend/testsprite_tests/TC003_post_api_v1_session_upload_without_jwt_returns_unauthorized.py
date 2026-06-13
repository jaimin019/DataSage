import requests

def test_post_api_v1_session_upload_without_jwt_returns_unauthorized():
    base_url = "http://localhost:8000"
    url = f"{base_url}/api/v1/session/upload"
    
    # Prepare a dummy CSV file content as bytes since file is required in the multipart/form-data
    files = {
        'file': ('test.csv', b'col1,col2\nval1,val2\n', 'text/csv')
    }
    
    try:
        response = requests.post(url, files=files, timeout=30)
        assert response.status_code == 401, f"Expected status code 401 but got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_post_api_v1_session_upload_without_jwt_returns_unauthorized()