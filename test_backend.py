import requests
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_pipeline():
    print("Uploading file...")
    start_time = time.time()
    with open("large_test.csv", "rb") as f:
        res = requests.post(f"{BASE_URL}/upload", files={"file": ("large_test.csv", f)})
        
    print(res.status_code, res.text)
    if res.status_code != 200:
        return
        
    session_id = res.json()["session_id"]
    print(f"Session ID: {session_id}")
    
    print("Checking dataset endpoint...")
    ds_res = requests.get(f"{BASE_URL}/session/{session_id}/dataset")
    print(ds_res.status_code, ds_res.json())
    
    print("Polling status...")
    while True:
        status_res = requests.get(f"{BASE_URL}/session/{session_id}/status")
        status = status_res.json()
        print(status)
        if status["status"] in ["done", "failed"]:
            break
        time.sleep(2)
        
    if status["status"] == "done":
        print("Pipeline finished successfully. Checking download endpoint...")
        dl_res = requests.get(f"{BASE_URL}/session/{session_id}/download/cleaned-csv", stream=True)
        print("Download status:", dl_res.status_code)
        print("Content-Disposition:", dl_res.headers.get("Content-Disposition"))

if __name__ == "__main__":
    test_pipeline()
